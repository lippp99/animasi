import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import * as THREE from 'three';
import type { GeneratedShotAudio, VoiceRole } from '../types/audio';
import type { CharacterActionType } from '../types/character';
import { FrameTimeline } from '../core/timeline';
import { createSeededRng, valueNoise1D } from '../core/math';
import { PAPER_CUTOUT_TOKENS, RENDER_CONFIG, SAFE_ZONE } from '../core/tokens';
import { createEpisodeRegistry, resolveEpisode } from '../episodes/index';
import { getEpisodeOutputPaths, parseCliFlag } from '../episodes/paths';
import { computeSpeechCacheKey } from '../audio/elevenLabsClient';
import { getVoiceRoleConfig } from '../audio/voiceConfig';
import { syncEpisodeTimelineWithClips } from '../audio/generateEpisodeAudio';
import { buildLayeredAudioGraph } from '../audio/sfxMixer';
import { evaluateCameraImpulses } from '../camera/impulse';
import { evaluateTimeDilation } from '../camera/cameraJuice';
import { resolveActiveChapterBadge } from '../overlay/hud';
import { getTerrainHeightAt } from '../world/terrainHeight';
import { solveSpatialClearance, type MutableActorFootprint } from '../world/spatial';
import { convertMaterialToToon } from '../world/glbPropLoader';
import {
  evaluateDampedSpring2D,
  evaluateFlipSpring,
  evaluateRig2D,
  solveTwoBoneIK2D,
  type CharacterBeatSample,
} from '../characters/characterRig2D';
import { resolveFaceState } from '../characters/characterFaceDraw';
import { buildVideoEncoderArgs } from './ffmpeg';
import { computeConcurrencyProfile } from './hardware';
import { buildQaFrameSelection, chunkFrames } from './qaPlanner';
import { buildProjectMapMarkdown } from './generateProjectMap';

const MAX_LINES_PER_FILE = 300;
const MAX_AGENTS_ROUTER_LINES = 70;
const FORBIDDEN_JS_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'output', '.git']);
const FORBIDDEN_CHAR_3D_PRIMITIVES = /\b(SphereGeometry|CylinderGeometry|CapsuleGeometry|TorusGeometry|BoxGeometry)\b/;

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function runCoreSelfChecks(): void {
  const rngA = createSeededRng(1260);
  const rngB = createSeededRng(1260);
  for (let i = 0; i < 10; i += 1) assert.equal(rngA(), rngB());
  assert.equal(valueNoise1D(3.45, 11), valueNoise1D(3.45, 11));

  assert.equal(RENDER_CONFIG.width, 1080);
  assert.equal(RENDER_CONFIG.height, 1920);
  assert.equal(RENDER_CONFIG.fps, 60);
  assert.equal(PAPER_CUTOUT_TOKENS.canvasWidth, 512);
  assert.equal(PAPER_CUTOUT_TOKENS.canvasHeight, 768);
  assert.ok(SAFE_ZONE.rightPx >= 160 && SAFE_ZONE.bottomPx >= 340);

  const defaultEpisode = createEpisodeRegistry().getDefault();
  assert.equal(resolveEpisode(defaultEpisode.id).id, defaultEpisode.id);
  assert.equal(parseCliFlag(['--episode=ain-jalut-1260'], 'episode'), 'ain-jalut-1260');
  const epPaths = getEpisodeOutputPaths('demo-slug', 'C:\\tmp');
  assert.ok(epPaths.finalMp4Path.endsWith('demo-slug\\final.mp4') || epPaths.finalMp4Path.endsWith('demo-slug/final.mp4'));

  const firstShot = defaultEpisode.shots[0];
  const lastShot = defaultEpisode.shots[defaultEpisode.shots.length - 1];
  assert.ok(firstShot !== undefined && lastShot !== undefined);
  assert.ok(defaultEpisode.shots.some((s) => s.cutaway?.enabled === true));

  const timeline = new FrameTimeline(defaultEpisode);
  assert.equal(timeline.resolve(0).shot.id, firstShot.id);
  assert.equal(timeline.resolve(99999).frame, defaultEpisode.totalFrames - 1);

  const introBadge = defaultEpisode.chapterBadges?.[0];
  if (introBadge !== undefined) {
    assert.ok(resolveActiveChapterBadge(defaultEpisode, introBadge.startFrame + 30) !== null);
    assert.equal(resolveActiveChapterBadge(defaultEpisode, introBadge.startFrame + introBadge.durationFrames + 30), null);
  }

  const h0 = getTerrainHeightAt(0, 0, defaultEpisode.world.terrain);
  assert.equal(h0, getTerrainHeightAt(0, 0, defaultEpisode.world.terrain));
  const actors: MutableActorFootprint[] = [
    { id: 'a', x: 0, y: 0, z: 0, radius: 0.6 },
    { id: 'b', x: 0.2, y: 0, z: 0, radius: 0.6 },
  ];
  solveSpatialClearance(actors, [{ id: 'prop', x: 0, z: 0, radius: 1.0, minY: 0, maxY: 3 }]);
  const sep = Math.hypot((actors[0]?.x ?? 0) - (actors[1]?.x ?? 0), (actors[0]?.z ?? 0) - (actors[1]?.z ?? 0));
  assert.ok(sep >= 1.2);

  const dropAccent = defaultEpisode.sfx?.accents.find((a) => a.cameraImpulse === 'drop_thud');
  if (dropAccent !== undefined) {
    assert.equal(evaluateCameraImpulses(dropAccent.frame, 60, defaultEpisode.sfx?.accents ?? []).offsetY, 0);
    assert.ok(evaluateCameraImpulses(dropAccent.frame + 4, 60, defaultEpisode.sfx?.accents ?? []).offsetY < 0);
  }

  const roles: readonly VoiceRole[] = ['narrator', 'commander', 'npc_reactive', 'npc_secondary'];
  for (const role of roles) assert.equal(getVoiceRoleConfig(role, 'v1').voiceId, 'v1');
  const keyA = computeSpeechCacheKey({ modelId: 'eleven_v4', voiceId: 'v1', text: 'Ain Jalut', stability: 0.5, similarityBoost: 0.75, style: 0.2, languageCode: 'id' });
  const keyB = computeSpeechCacheKey({ modelId: 'eleven_v4', voiceId: 'v1', text: '  Ain Jalut  ', stability: 0.5, similarityBoost: 0.75, style: 0.2, languageCode: 'id' });
  assert.equal(keyA, keyB);

  const synced = syncEpisodeTimelineWithClips(defaultEpisode, new Map([[firstShot.id, 300]]));
  assert.equal(synced.shots[0]?.endFrame, firstShot.narration?.autoSyncDuration ? 314 : firstShot.endFrame);

  const dummyClips: readonly GeneratedShotAudio[] = [
    { shotId: 's1', voiceRole: 'narrator', audioPath: 'a.mp3', startFrame: 0, durationFrames: 120, durationSec: 2 },
  ];
  const graph = buildLayeredAudioGraph({ fps: 60, totalDurationSec: 60, voiceClips: dummyClips, sfx: defaultEpisode.sfx });
  assert.ok(graph !== null && graph.filterComplex.includes('sidechaincompress'));

  assert.ok(buildVideoEncoderArgs('h264_qsv').includes('h264_qsv'));
  assert.ok(buildVideoEncoderArgs('libx264').includes('libx264'));
  assert.equal(computeConcurrencyProfile(16, 63.7).workerCount, 4);
  assert.ok(buildQaFrameSelection(defaultEpisode, defaultEpisode.totalFrames, 'dense', 90).length > 20);
  assert.equal(chunkFrames(buildQaFrameSelection(defaultEpisode, 60, 'all'), 30).length, 2);

  // Pure 2D Vector Cutout Two-Bone IK exactness, face state & GLB->Toon material checks
  const ik = solveTwoBoneIK2D({ x: 240, y: 550 }, { x: 268, y: 720 }, 92, 92, 1);
  assert.ok(Math.abs(Math.hypot(ik.joint.x - 240, ik.joint.y - 550) - 92) < 1e-4);
  assert.ok(Math.abs(Math.hypot(ik.end.x - ik.joint.x, ik.end.y - ik.joint.y) - 92) < 1e-4);

  const actions: readonly CharacterActionType[] = [
    'idle_breathing', 'walk', 'run_sprint', 'sneak', 'kneel_inspect', 'point_command',
    'combat_slash_or_block', 'draw_bow', 'stagger_knockback', 'explain_gesture', 'riding_bob',
  ];
  for (const action of actions) {
    const beat = {
      startFrame: 0, endFrame: 120, fromPosition: [0, 0, 0] as const, toPosition: [0, 0, 4] as const,
      facingYaw: 0, action, expression: 'shocked' as const,
    };
    const sample: CharacterBeatSample = {
      beat, beatProgress: 0.4, worldX: 0, worldY: 0, worldZ: 1.6, facingYaw: 0, travelDist: 4, travelProgress: 0.4, energy: 1,
    };
    const rig = evaluateRig2D(sample, 0.8, 42, true);
    assert.ok(Number.isFinite(rig.gripSocketA.x) && Number.isFinite(rig.leftFoot.y));
    const face = resolveFaceState(beat, 30, 60, 42, true);
    assert.equal(face.eyeState, 'wide_shock');
    assert.ok(face.audioAmplitude > 0);
  }
  assert.ok(Number.isFinite(evaluateDampedSpring2D(1.2, 0.5, 0.9)));
  assert.ok(Math.abs(evaluateFlipSpring(-1, 1, 0.5)) >= PAPER_CUTOUT_TOKENS.minFlipScaleX);

  const stdMat = new THREE.MeshStandardMaterial({ color: 0x88aa66 });
  const toonConv = convertMaterialToToon(stdMat, [], { value: new THREE.Color(0xffd166) });
  assert.ok(toonConv.material instanceof THREE.MeshToonMaterial);
  stdMat.dispose();
  toonConv.material.dispose();

  const slowImpact = defaultEpisode.sfx?.accents.find((a) => (a.timeDilationFrames ?? 0) > 0);
  if (slowImpact !== undefined) {
    assert.equal(evaluateTimeDilation(slowImpact.frame + 2, 60, defaultEpisode.sfx?.accents ?? []).speedMultiplier, 0.25);
  }

  const mapMd = buildProjectMapMarkdown(process.cwd());
  assert.ok(mapMd.includes('src/') && !mapMd.includes('├── node_modules/') && !/\s\.env(?:\r?\n|$)/.test(mapMd));
}

function runAudit(): void {
  const root = process.cwd();
  const allFiles = walkFiles(root);
  const jsFiles = allFiles.filter((f) => FORBIDDEN_JS_EXTENSIONS.has(extname(f)));
  assert.equal(jsFiles.length, 0, `Forbidden plain JS files found: ${jsFiles.map((f) => relative(root, f)).join(', ')}`);

  const tsFiles = allFiles.filter((f) => extname(f) === '.ts').sort();
  const rulesDir = join(root, 'docs', 'rules');
  const ruleDocs = existsSync(rulesDir)
    ? readdirSync(rulesDir).filter((f) => f.endsWith('.md')).sort().map((f) => join(rulesDir, f))
    : [];

  const violations: string[] = [];
  const anyPattern = /\b(:\s*any\b|as\s+any\b|<any>)/;

  console.log('=== TypeScript File Line-Count Audit (< 300 lines) ===');
  for (const file of tsFiles) {
    const rel = relative(root, file).replaceAll('\\', '/');
    const content = readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/).length;
    console.log(`  ${String(lines).padStart(4, ' ')} lines | ${rel}`);
    if (lines >= MAX_LINES_PER_FILE) violations.push(`${rel} has ${lines} lines (limit < ${MAX_LINES_PER_FILE})`);
    if (rel !== 'src/render/audit.ts' && anyPattern.test(content)) violations.push(`${rel} contains forbidden "any" type`);
    if (rel.startsWith('src/characters/') && FORBIDDEN_CHAR_3D_PRIMITIVES.test(content)) {
      violations.push(`${rel} contains forbidden 3D mesh primitive (only THREE.PlaneGeometry allowed in src/characters/)`);
    }
  }

  console.log('\n=== Rules & Router Documentation Audit ===');
  const agentsPath = join(root, 'AGENTS.md');
  if (existsSync(agentsPath)) {
    const agentsLines = readFileSync(agentsPath, 'utf8').split(/\r?\n/).length;
    console.log(`  ${String(agentsLines).padStart(4, ' ')} lines | AGENTS.md (limit < ${MAX_AGENTS_ROUTER_LINES})`);
    if (agentsLines >= MAX_AGENTS_ROUTER_LINES) violations.push(`AGENTS.md has ${agentsLines} lines (limit < ${MAX_AGENTS_ROUTER_LINES})`);
  }
  for (const doc of ruleDocs) {
    const rel = relative(root, doc).replaceAll('\\', '/');
    const lines = readFileSync(doc, 'utf8').split(/\r?\n/).length;
    console.log(`  ${String(lines).padStart(4, ' ')} lines | ${rel}`);
    if (lines >= MAX_LINES_PER_FILE) violations.push(`${rel} has ${lines} lines (limit < ${MAX_LINES_PER_FILE})`);
  }

  assert.equal(violations.length, 0, `Audit violations:\n- ${violations.join('\n- ')}`);
  runCoreSelfChecks();

  console.log(
    `\nAudit PASSED: ${tsFiles.length} .ts files & ${ruleDocs.length} rule docs checked, 0 .js files, 0 3D character primitives, 0 violations, all self-checks OK.`,
  );
}

runAudit();
