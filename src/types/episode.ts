import type { ShotCameraConfig } from './camera';
import type { EpisodeAudioManifest, ShotNarrationSpec } from './audio';
import type { AudioCue, SfxTrackSpec } from './common';
import type { CharacterSpec, CrowdSpec } from './character';
import type { CutawaySpec, TimeOfDayPreset, WeatherType, WorldSpec } from './world';

export interface SubtitleCue {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly speaker?: string;
  readonly text: string;
  readonly highlightWord?: string;
}

export interface HudBadge {
  readonly era: string;
  readonly location: string;
}

export interface ChapterBadgeCue {
  readonly startFrame: number;
  readonly durationFrames: number;
  readonly era: string;
  readonly location: string;
}

export interface InfographicCallout {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly metric: string;
  readonly label: string;
  readonly icon: 'ship' | 'wall' | 'flame' | 'compass';
}

export interface ShotSpec {
  readonly id: string;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly mood: TimeOfDayPreset;
  readonly weather: WeatherType;
  readonly weatherIntensity: number;
  readonly camera: ShotCameraConfig;
  readonly cutaway?: CutawaySpec;
  readonly narration?: ShotNarrationSpec;
}

export interface EpisodeSpec {
  readonly id: string;
  readonly title: string;
  readonly fps: number;
  readonly totalFrames: number;
  readonly badge: HudBadge;
  readonly chapterBadges?: readonly ChapterBadgeCue[];
  readonly world: WorldSpec;
  readonly characters: readonly CharacterSpec[];
  readonly crowds: readonly CrowdSpec[];
  readonly shots: readonly ShotSpec[];
  readonly subtitles: readonly SubtitleCue[];
  readonly callouts: readonly InfographicCallout[];
  readonly audioCues: readonly AudioCue[];
  readonly sfx?: SfxTrackSpec;
}

export interface EngineMeta {
  readonly episodeId: string;
  readonly title: string;
  readonly fps: number;
  readonly totalFrames: number;
  readonly width: number;
  readonly height: number;
}

export interface EngineBridge {
  seekFrame(frame: number): void;
  getMeta(): EngineMeta;
  setEpisode(episodeId: string): void;
  applyAudioManifest(manifest: EpisodeAudioManifest): void;
  dispose(): void;
}
