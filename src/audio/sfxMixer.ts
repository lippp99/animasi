import type { GeneratedShotAudio } from '../types/audio';
import type { SfxAccentEvent, SfxAccentKind, SfxAmbientKind, SfxTrackSpec } from '../types/common';
import { SFX_TOKENS } from '../core/tokens';

export interface AudioGraphResult {
  readonly extraInputArgs: readonly string[];
  readonly filterComplex: string;
  readonly audioMapLabel: string;
}

function buildAmbientFilterChain(kind: SfxAmbientKind, durationSec: number, gain: number): string {
  const dur = Math.max(1, durationSec).toFixed(2);
  const g = gain.toFixed(3);
  switch (kind) {
    case 'night_wind':
      return `anoisesrc=color=pink:sample_rate=44100:duration=${dur},lowpass=f=480,highpass=f=85,tremolo=f=0.22:d=0.45,volume=${g}`;
    case 'ocean_waves':
      return `anoisesrc=color=brown:sample_rate=44100:duration=${dur},lowpass=f=720,tremolo=f=0.18:d=0.65,volume=${g}`;
    case 'campfire_crackle':
      return `anoisesrc=color=pink:sample_rate=44100:duration=${dur},bandpass=f=1100:w=900,tremolo=f=3.2:d=0.55,volume=${g}`;
    case 'dawn_breeze':
      return `anoisesrc=color=pink:sample_rate=44100:duration=${dur},bandpass=f=540:w=360,tremolo=f=0.28:d=0.35,volume=${g}`;
  }
}

function buildAccentSynthFilter(kind: SfxAccentKind, gain: number): string {
  const g = gain.toFixed(3);
  switch (kind) {
    case 'heavy_thud':
      return `sine=frequency=68:sample_rate=44100:duration=0.42,afade=t=out:st=0.04:d=0.38,lowpass=f=180,volume=${g}`;
    case 'war_drum':
      return `sine=frequency=92:sample_rate=44100:duration=0.68,afade=t=out:st=0.05:d=0.63,lowpass=f=240,volume=${g}`;
    case 'wood_creak':
      return `anoisesrc=color=brown:sample_rate=44100:duration=0.45,bandpass=f=360:w=160,afade=t=in:st=0:d=0.06,afade=t=out:st=0.22:d=0.23,volume=${g}`;
    case 'metal_clang':
      return `sine=frequency=860:sample_rate=44100:duration=0.38,afade=t=out:st=0.02:d=0.36,highpass=f=500,volume=${g}`;
    case 'whoosh':
      return `anoisesrc=color=white:sample_rate=44100:duration=0.34,bandpass=f=680:w=520,afade=t=in:st=0:d=0.08,afade=t=out:st=0.14:d=0.20,volume=${g}`;
    case 'arrow_volley':
      return `anoisesrc=color=white:sample_rate=44100:duration=0.85,bandpass=f=1850:w=900,tremolo=f=18:d=0.82,afade=t=in:st=0:d=0.12,afade=t=out:st=0.45:d=0.40,volume=${g}`;
  }
}

/**
 * Builds a complete FFmpeg filter_complex combining:
 * 1) ElevenLabs timed voiceover clips (or single audioPath)
 * 2) Subtle atmospheric ambient bed
 * 3) Selective accent SFX locked to exact frame timestamps
 * 4) Sidechain auto-ducking so SFX/ambient automatically dip whenever voice speaks
 */
export function buildLayeredAudioGraph(params: {
  readonly fps: number;
  readonly totalDurationSec: number;
  readonly audioPath?: string;
  readonly voiceClips?: readonly GeneratedShotAudio[];
  readonly sfx?: SfxTrackSpec;
}): AudioGraphResult | null {
  const voiceClips = params.voiceClips ?? [];
  const hasVoiceClips = voiceClips.length > 0;
  const hasSingleAudio = !hasVoiceClips && params.audioPath !== undefined;
  const hasVoice = hasVoiceClips || hasSingleAudio;
  const hasSfx = params.sfx !== undefined;

  if (!hasVoice && !hasSfx) return null;

  const extraInputArgs: string[] = [];
  const chains: string[] = [];

  if (hasVoiceClips) {
    const voiceLabels: string[] = [];
    const totalFrames = Math.round(params.totalDurationSec * params.fps);
    for (let i = 0; i < voiceClips.length; i += 1) {
      const clip = voiceClips[i];
      if (clip === undefined) continue;
      extraInputArgs.push('-i', clip.audioPath);
      const inputIdx = i + 1;
      const delayMs = Math.max(0, Math.round((clip.startFrame / params.fps) * 1000));
      const nextStart = voiceClips[i + 1]?.startFrame ?? totalFrames;
      const slotFrames = Math.max(30, nextStart - clip.startFrame - 6);
      const tempo =
        clip.durationFrames > slotFrames
          ? Math.min(1.4, clip.durationFrames / slotFrames)
          : 1.0;
      const tempoFilter = tempo > 1.01 ? `atempo=${tempo.toFixed(3)},` : '';
      const lbl = `v${i}`;
      chains.push(
        `[${inputIdx}:a]${tempoFilter}adelay=${delayMs}|${delayMs},aresample=async=1[${lbl}]`,
      );
      voiceLabels.push(`[${lbl}]`);
    }
    if (voiceLabels.length === 1) {
      chains.push(`${voiceLabels[0]}anull[vbus]`);
    } else {
      chains.push(
        `${voiceLabels.join('')}amix=inputs=${voiceLabels.length}:duration=longest:normalize=0[vbus]`,
      );
    }
  } else if (hasSingleAudio && params.audioPath !== undefined) {
    extraInputArgs.push('-i', params.audioPath);
    chains.push(`[1:a]aresample=async=1[vbus]`);
  }

  if (hasSfx && params.sfx !== undefined) {
    const ambGain = params.sfx.ambientGain ?? SFX_TOKENS.defaultAmbientGain;
    chains.push(
      `${buildAmbientFilterChain(params.sfx.ambient, params.totalDurationSec, ambGain)},aformat=channel_layouts=stereo[amb]`,
    );

    const sfxLabels: string[] = ['[amb]'];
    const accents: readonly SfxAccentEvent[] = params.sfx.accents;
    for (let i = 0; i < accents.length; i += 1) {
      const evt = accents[i];
      if (evt === undefined) continue;
      const delayMs = Math.max(0, Math.round((evt.frame / params.fps) * 1000));
      const lbl = `sfx${i}`;
      chains.push(
        `${buildAccentSynthFilter(evt.kind, evt.gain)},aformat=channel_layouts=stereo,adelay=${delayMs}|${delayMs}[${lbl}]`,
      );
      sfxLabels.push(`[${lbl}]`);
    }

    if (sfxLabels.length === 1) {
      chains.push(`[amb]anull[sfxbus]`);
    } else {
      chains.push(
        `${sfxLabels.join('')}amix=inputs=${sfxLabels.length}:duration=first:normalize=0[sfxbus]`,
      );
    }
  }

  const dur = Math.max(1, params.totalDurationSec + 0.25).toFixed(3);
  if (hasVoice && hasSfx) {
    const duckRatio = params.sfx?.duckRatio ?? SFX_TOKENS.defaultDuckRatio;
    chains.push('[vbus]asplit=2[vmain][vsc]');
    chains.push(
      `[sfxbus][vsc]sidechaincompress=threshold=${SFX_TOKENS.defaultDuckThreshold}:ratio=${duckRatio}:attack=25:release=260[sfxduck]`,
    );
    chains.push(`[vmain][sfxduck]amix=inputs=2:duration=longest:normalize=0,apad=whole_dur=${dur}[aout]`);
  } else if (hasVoice) {
    chains.push(`[vbus]apad=whole_dur=${dur}[aout]`);
  } else {
    chains.push(`[sfxbus]apad=whole_dur=${dur}[aout]`);
  }

  return {
    extraInputArgs,
    filterComplex: chains.join(';'),
    audioMapLabel: '[aout]',
  };
}
