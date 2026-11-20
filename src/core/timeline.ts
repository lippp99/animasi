import type { EpisodeSpec, ShotSpec } from '../types/episode';
import { clamp } from './math';

export interface ResolvedTimelineFrame {
  readonly frame: number;
  readonly timeSec: number;
  readonly normalizedEpisode: number;
  readonly shot: ShotSpec;
  readonly shotIndex: number;
  readonly shotLocalFrame: number;
  readonly shotProgress: number;
  readonly transitionProgress: number;
}

export class FrameTimeline {
  private readonly episode: EpisodeSpec;

  public constructor(episode: EpisodeSpec) {
    if (episode.shots.length === 0) {
      throw new Error(`Episode "${episode.id}" must define at least one shot.`);
    }
    this.episode = episode;
  }

  public get totalFrames(): number {
    return this.episode.totalFrames;
  }

  public get fps(): number {
    return this.episode.fps;
  }

  public clampFrame(rawFrame: number): number {
    const maxFrame = Math.max(0, this.episode.totalFrames - 1);
    return clamp(Math.floor(rawFrame), 0, maxFrame);
  }

  public resolve(rawFrame: number): ResolvedTimelineFrame {
    const frame = this.clampFrame(rawFrame);
    const shots = this.episode.shots;
    let shotIndex = shots.length - 1;

    for (let i = 0; i < shots.length; i += 1) {
      const candidate = shots[i];
      if (candidate !== undefined && frame >= candidate.startFrame && frame < candidate.endFrame) {
        shotIndex = i;
        break;
      }
    }

    const shot = shots[shotIndex];
    if (shot === undefined) {
      throw new Error(`Unable to resolve shot for frame ${frame}.`);
    }

    const duration = Math.max(1, shot.endFrame - shot.startFrame);
    const shotLocalFrame = clamp(frame - shot.startFrame, 0, duration);
    const shotProgress = clamp(shotLocalFrame / duration, 0, 1);

    const transFrames = Math.max(0, shot.camera.transitionFrames);
    const transitionProgress =
      transFrames === 0 ? 1 : clamp(shotLocalFrame / transFrames, 0, 1);

    return {
      frame,
      timeSec: frame / this.episode.fps,
      normalizedEpisode: frame / Math.max(1, this.episode.totalFrames - 1),
      shot,
      shotIndex,
      shotLocalFrame,
      shotProgress,
      transitionProgress,
    };
  }
}
