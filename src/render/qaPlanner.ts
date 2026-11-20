import type { EpisodeSpec } from '../types/episode';
import { clamp } from '../core/math';
import { QA_REVIEW_TOKENS } from '../core/tokens';

export type QaExtractMode = 'dense' | 'all';

/**
 * Computes the exact sorted list of frame indices to extract for visual QA.
 * - `all`: every frame sequentially [0 .. totalFrames - 1].
 * - `dense`: regular sweep + every shot boundary/transition/midpoint, subtitle midpoint,
 *   chapter badge show & post-dismissal check, and every SFX/impulse peak frame.
 */
export function buildQaFrameSelection(
  episode: EpisodeSpec,
  totalFrames: number,
  mode: QaExtractMode,
  stepFrames: number = QA_REVIEW_TOKENS.denseStepFrames,
): readonly number[] {
  const maxIdx = Math.max(0, totalFrames - 1);
  if (mode === 'all') {
    const all: number[] = [];
    for (let f = 0; f <= maxIdx; f += 1) {
      all.push(f);
    }
    return all;
  }

  const picked = new Set<number>();
  const add = (f: number): void => {
    picked.add(clamp(Math.round(f), 0, maxIdx));
  };

  const step = Math.max(1, Math.floor(stepFrames));
  for (let f = 0; f <= maxIdx; f += step) {
    add(f);
  }
  add(maxIdx);

  for (const shot of episode.shots) {
    add(shot.startFrame + 2);
    if (shot.camera.transitionFrames > 0) {
      add(shot.startFrame + Math.floor(shot.camera.transitionFrames * 0.5));
      add(shot.startFrame + shot.camera.transitionFrames + 2);
    }
    add(Math.floor((shot.startFrame + shot.endFrame) * 0.5));
    add(shot.endFrame - 2);
  }

  for (const sub of episode.subtitles) {
    add(Math.floor((sub.startFrame + sub.endFrame) * 0.5));
  }

  for (const badge of episode.chapterBadges ?? []) {
    add(badge.startFrame + Math.floor(badge.durationFrames * 0.4));
    // Explicitly capture frame right after auto-dismiss to verify badge disappeared cleanly
    add(badge.startFrame + badge.durationFrames + 8);
  }

  for (const accent of episode.sfx?.accents ?? []) {
    add(accent.frame);
    if (accent.cameraImpulse !== undefined) {
      add(accent.frame + 4);
    }
  }

  return [...picked].sort((a, b) => a - b);
}

export function chunkFrames(
  frames: readonly number[],
  perSheet: number,
): readonly (readonly number[])[] {
  const size = Math.max(1, perSheet);
  const chunks: number[][] = [];
  for (let i = 0; i < frames.length; i += size) {
    chunks.push(frames.slice(i, i + size));
  }
  return chunks;
}
