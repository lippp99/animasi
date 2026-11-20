import * as THREE from 'three';
import type { EpisodeAudioManifest } from '../types/audio';
import type { EngineBridge, EngineMeta, EpisodeSpec } from '../types/episode';
import { RENDER_CONFIG } from '../core/tokens';
import { FrameTimeline } from '../core/timeline';
import { EpisodeRegistry } from '../core/registry';
import { CameraDirector } from '../camera/director';
import { evaluateTimeDilation } from '../camera/cameraJuice';
import { AtmosphericSkySystem } from '../world/atmosphericSky';
import { CutawaySystem } from '../world/cutawaySystem';
import { LayeredEnvironmentSystem } from '../world/layeredEnvironment';
import { TerrainAndSetPiecesSystem } from '../world/terrainAndSetPieces';
import { WeatherParticleSystem } from '../world/weather';
import { PostProcessor } from '../world/postProcessing';
import type { MutableActorFootprint, SpatialObstacle } from '../world/spatial';
import { buildPropObstacles, solveSpatialClearance } from '../world/spatial';
import { getTerrainHeightAt } from '../world/terrainHeight';
import { ImpactVfxSystem, type FootDustInput } from '../vfx/impactVfx';
import {
  createPaperBillboardActor,
  PaperBillboardCrowdGroup,
  samplePaperBillboardBeat,
  updatePaperBillboardActor,
  type PaperBillboardActor,
} from '../characters/characterBillboard';
import { OverlayRenderer } from '../overlay/hud';

export class AnimationEngine implements EngineBridge {
  private readonly registry: EpisodeRegistry;
  private readonly stageShell: HTMLDivElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly overlay: OverlayRenderer;

  private scene!: THREE.Scene;
  private timeline!: FrameTimeline;
  private episode!: EpisodeSpec;
  private director!: CameraDirector;
  private sky!: AtmosphericSkySystem;
  private cutaway!: CutawaySystem;
  private layeredEnv!: LayeredEnvironmentSystem;
  private worldSetPieces!: TerrainAndSetPiecesSystem;
  private weather!: WeatherParticleSystem;
  private impactVfx!: ImpactVfxSystem;
  private postProcessor!: PostProcessor;
  private propObstacles: readonly SpatialObstacle[] = [];
  private characters: PaperBillboardActor[] = [];
  private crowds: PaperBillboardCrowdGroup[] = [];
  private audioManifest: EpisodeAudioManifest | null = null;
  private readonly characterPosMap = new Map<string, THREE.Vector3>();
  private readonly focusPoint = new THREE.Vector3();

  public constructor(mountRoot: HTMLElement, registry: EpisodeRegistry, initialEpisodeId?: string) {
    this.registry = registry;
    this.stageShell = document.createElement('div');
    this.stageShell.className = 'stage-shell';
    mountRoot.replaceChildren(this.stageShell);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(RENDER_CONFIG.width, RENDER_CONFIG.height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
    this.renderer.domElement.className = 'stage-canvas';

    this.stageShell.appendChild(this.renderer.domElement);
    this.overlay = new OverlayRenderer(this.stageShell);

    const episode =
      initialEpisodeId !== undefined ? this.registry.get(initialEpisodeId) : this.registry.getDefault();
    this.loadEpisode(episode);
  }

  public fitToViewport(isRenderMode: boolean): void {
    if (isRenderMode) {
      this.stageShell.style.transform = 'none';
      return;
    }
    const scale = Math.min(window.innerWidth / RENDER_CONFIG.width, window.innerHeight / RENDER_CONFIG.height);
    this.stageShell.style.transform = `scale(${Math.min(1, scale).toFixed(4)})`;
  }

  public setEpisode(episodeId: string): void {
    this.disposeSceneResources();
    this.audioManifest = null;
    this.loadEpisode(this.registry.get(episodeId));
    this.seekFrame(0);
  }

  public dispose(): void {
    this.disposeSceneResources();
    this.renderer.dispose();
  }

  public applyAudioManifest(manifest: EpisodeAudioManifest): void {
    this.audioManifest = manifest;
    const clipByShot = new Map(manifest.clips.map((c) => [c.shotId, c]));
    let cursor = 0;
    const syncedShots = this.episode.shots.map((shot) => {
      const clip = clipByShot.get(shot.id);
      const baseDur = Math.max(1, shot.endFrame - shot.startFrame);
      const dur =
        shot.narration?.autoSyncDuration === true && clip !== undefined
          ? Math.max(baseDur, clip.durationFrames + 14)
          : baseDur;
      const nextShot = { ...shot, startFrame: cursor, endFrame: cursor + dur };
      cursor += dur;
      return nextShot;
    });
    this.episode = { ...this.episode, shots: syncedShots, totalFrames: cursor };
    this.timeline = new FrameTimeline(this.episode);
  }

  public getMeta(): EngineMeta {
    return {
      episodeId: this.episode.id,
      title: this.episode.title,
      fps: this.episode.fps,
      totalFrames: this.episode.totalFrames,
      width: RENDER_CONFIG.width,
      height: RENDER_CONFIG.height,
    };
  }

  public seekFrame(rawFrame: number): void {
    const resolved = this.timeline.resolve(rawFrame);
    const sfxAccents = this.episode.sfx?.accents ?? [];
    const dilation = evaluateTimeDilation(resolved.frame, this.episode.fps, sfxAccents);
    const activeClip = this.audioManifest?.clips.find(
      (c) => resolved.frame >= c.startFrame && resolved.frame < c.startFrame + c.durationFrames,
    );
    const shotNarration = resolved.shot.narration;
    const terrain = this.episode.world.terrain;

    // Phase 1: sample actor beats & solve spatial clearance + terrain ground lock
    const samples = this.characters.map((c) => samplePaperBillboardBeat(c, dilation.simFrame, terrain));
    const actorFootprints: MutableActorFootprint[] = this.characters.map((c, i) => ({
      id: c.spec.id,
      x: samples[i]?.worldX ?? 0,
      y: samples[i]?.worldY ?? 0,
      z: samples[i]?.worldZ ?? 0,
      radius: c.footprintRadius,
    }));
    solveSpatialClearance(actorFootprints, this.propObstacles);

    this.characterPosMap.clear();
    const lockedYs: number[] = [];
    for (let i = 0; i < this.characters.length; i += 1) {
      const char = this.characters[i];
      const fp = actorFootprints[i];
      if (char === undefined || fp === undefined) continue;
      const gy = char.spec.lockToGround !== false && fp.y < 0.5 ? getTerrainHeightAt(fp.x, fp.z, terrain) : fp.y;
      lockedYs.push(gy);
      char.worldPosition.set(fp.x, gy, fp.z);
      this.characterPosMap.set(char.spec.id, char.worldPosition);
    }

    // Phase 2: evaluate 360° camera & 3D cutaway BEFORE rendering billboards (zero 1-frame billboard lag!)
    const camEval = this.director.evaluate(resolved, this.characterPosMap, sfxAccents, this.episode.fps);
    this.cutaway.evaluate(resolved.shot.cutaway, resolved.shotProgress);

    // Phase 3: draw 512x768 2D Paper-Cutout actors & update Y-locked billboards + shadows
    const footDustInputs: FootDustInput[] = [];
    for (let i = 0; i < this.characters.length; i += 1) {
      const char = this.characters[i];
      const fp = actorFootprints[i];
      const sample = samples[i];
      const gy = lockedYs[i] ?? 0;
      if (char === undefined || fp === undefined || sample === undefined) continue;
      const isVoiceMatched =
        activeClip !== undefined
          ? activeClip.speakerCharacterId === char.spec.id ||
            (activeClip.speakerCharacterId === undefined && char.spec.voiceRole === activeClip.voiceRole)
          : shotNarration !== undefined &&
            (shotNarration.speakerCharacterId === char.spec.id ||
              (shotNarration.speakerCharacterId === undefined && char.spec.voiceRole === shotNarration.voiceRole));

      footDustInputs.push(
        updatePaperBillboardActor(char, sample, fp.x, gy, fp.z, dilation.simFrame, this.episode.fps, this.director.camera.position, isVoiceMatched),
      );
    }

    const crowdObstacles: SpatialObstacle[] = [
      ...this.propObstacles,
      ...actorFootprints.map((fp) => ({ id: `hero-${fp.id}`, x: fp.x, z: fp.z, radius: fp.radius, minY: fp.y, maxY: fp.y + 2.2 })),
    ];
    for (const crowd of this.crowds) {
      crowd.update(dilation.simFrame, dilation.simTimeSec, terrain, crowdObstacles, this.director.camera.position);
    }

    const focusChar =
      resolved.shot.camera.focusCharacterId !== undefined ? this.characterPosMap.get(resolved.shot.camera.focusCharacterId) : undefined;
    if (focusChar !== undefined) this.focusPoint.copy(focusChar);
    else this.focusPoint.set(...resolved.shot.camera.target);

    const moodTokens = this.sky.update(resolved.shot.mood, dilation.simTimeSec, this.focusPoint, this.director.camera.position);
    this.layeredEnv.update(moodTokens, dilation.simTimeSec);
    this.worldSetPieces.update(dilation.simTimeSec, moodTokens);
    this.weather.update(resolved.shot.weather, resolved.shot.weatherIntensity, dilation.simTimeSec, this.focusPoint);
    this.impactVfx.update(resolved.frame, this.episode.fps, dilation.simTimeSec, sfxAccents, footDustInputs, terrain, camEval.projectilePos, camEval.projectileLook);

    this.postProcessor.applyMood(moodTokens, camEval.focusDistance, resolved.frame, dilation.impactFlash);
    this.postProcessor.render();
    this.overlay.update(this.episode, resolved.frame, camEval.transitions);
  }

  private loadEpisode(episode: EpisodeSpec): void {
    this.episode = episode;
    this.timeline = new FrameTimeline(episode);
    this.scene = new THREE.Scene();

    const aspect = RENDER_CONFIG.width / RENDER_CONFIG.height;
    this.director = new CameraDirector(aspect);
    this.cutaway = new CutawaySystem(this.scene, this.renderer);
    this.sky = new AtmosphericSkySystem(this.scene, episode.world.terrain.seed);
    this.layeredEnv = new LayeredEnvironmentSystem(this.scene, this.director.camera, episode.world.terrain.seed);
    this.worldSetPieces = new TerrainAndSetPiecesSystem(
      this.scene,
      episode.world,
      this.cutaway.clippingPlanes,
      this.cutaway.rimColorUniform,
    );
    this.propObstacles = buildPropObstacles(episode.world.props, episode.world.terrain);
    this.weather = new WeatherParticleSystem(this.scene, episode.world.terrain.seed + 77);

    const braziers = episode.world.props
      .filter((p) => p.kind === 'brazier')
      .map(
        (p) =>
          new THREE.Vector3(
            p.position[0],
            getTerrainHeightAt(p.position[0], p.position[2], episode.world.terrain) + p.position[1],
            p.position[2],
          ),
      );
    this.impactVfx = new ImpactVfxSystem(this.scene, braziers, episode.world.terrain.seed);
    this.postProcessor = new PostProcessor(this.renderer, this.scene, this.director.camera, RENDER_CONFIG.width, RENDER_CONFIG.height);
    this.characters = episode.characters.map((spec) => createPaperBillboardActor(this.scene, spec));
    this.crowds = episode.crowds.map((spec) => new PaperBillboardCrowdGroup(this.scene, spec));
  }

  private disposeSceneResources(): void {
    if (this.scene === undefined) return;
    for (const actor of this.characters) {
      actor.texture.dispose();
      actor.material.dispose();
      actor.depthMaterial.dispose();
    }
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (mat instanceof THREE.Material) mat.dispose();
        }
      }
    });
    this.scene.clear();
  }
}
