import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EpisodeAudioManifest, GeneratedShotAudio } from '../types/audio';
import type { EpisodeSpec, ShotSpec } from '../types/episode';
import { resolveEpisode } from '../episodes/index';
import { getEpisodeOutputPaths, parseCliFlag } from '../episodes/paths';
import { ElevenLabsClient } from './elevenLabsClient';
import { ELEVENLABS_DEFAULTS, getVoiceRoleConfig } from './voiceConfig';

export function probeAudioDurationSec(filePath: string): number {
  const output = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ],
    { encoding: 'utf8' },
  ).trim();
  const parsed = Number.parseFloat(output);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Gagal membaca durasi audio yang valid dari "${filePath}": "${output}"`);
  }
  return parsed;
}

/**
 * Pure helper: recalculates sequential shot frames from measured audio clip durations
 * when shot.narration.autoSyncDuration is enabled.
 */
export function syncEpisodeTimelineWithClips(
  episode: EpisodeSpec,
  clipDurationsByShotId: ReadonlyMap<string, number>,
): { readonly shots: readonly ShotSpec[]; readonly totalFrames: number } {
  let cursorFrame = 0;
  const updatedShots: ShotSpec[] = [];

  for (const shot of episode.shots) {
    const baseDuration = Math.max(1, shot.endFrame - shot.startFrame);
    const audioFrames = clipDurationsByShotId.get(shot.id);
    const shouldSync = shot.narration?.autoSyncDuration === true && audioFrames !== undefined;
    const durationFrames = shouldSync
      ? Math.max(baseDuration, audioFrames + ELEVENLABS_DEFAULTS.shotTailPaddingFrames)
      : baseDuration;

    updatedShots.push({
      ...shot,
      startFrame: cursorFrame,
      endFrame: cursorFrame + durationFrames,
    });
    cursorFrame += durationFrames;
  }

  return { shots: updatedShots, totalFrames: cursorFrame };
}

export async function generateEpisodeAudio(episode: EpisodeSpec): Promise<EpisodeAudioManifest> {
  const client = new ElevenLabsClient();
  const verifiedModel = await client.resolveVerifiedModel();
  const voices = await client.listVoices();
  const fallbackVoiceId = voices[0]?.voice_id ?? '';

  const paths = getEpisodeOutputPaths(episode.id);
  mkdirSync(paths.audioDir, { recursive: true });

  const measuredFrames = new Map<string, number>();
  const rawClips: Array<{
    readonly shotId: string;
    readonly voiceRole: NonNullable<ShotSpec['narration']>['voiceRole'];
    readonly speakerCharacterId?: string;
    readonly audioPath: string;
    readonly durationSec: number;
    readonly durationFrames: number;
  }> = [];

  for (const shot of episode.shots) {
    const narration = shot.narration;
    if (narration === undefined || narration.narrationText.trim().length === 0) {
      continue;
    }

    const settings = getVoiceRoleConfig(narration.voiceRole);
    const voiceId = settings.voiceId.length > 0 ? settings.voiceId : fallbackVoiceId;
    const clipPath =
      narration.audioPath !== undefined && existsSync(narration.audioPath)
        ? resolve(narration.audioPath)
        : join(paths.audioDir, `${shot.id}.mp3`);

    if (narration.audioPath === undefined || !existsSync(narration.audioPath)) {
      const result = await client.synthesizeSpeech({
        text: narration.narrationText,
        voiceId,
        settings,
        modelId: verifiedModel.model_id,
        languageCode: narration.languageCode,
        outputPath: clipPath,
        supportsStyle: verifiedModel.can_use_style === true,
      });
      console.log(
        `[Audio] ${shot.id} (${narration.voiceRole}) -> ${result.fromCache ? 'CACHE' : 'API'} (${verifiedModel.model_id})`,
      );
    }

    const durationSec = probeAudioDurationSec(clipPath);
    const durationFrames = Math.ceil(durationSec * episode.fps);
    measuredFrames.set(shot.id, durationFrames);

    const matchedChar =
      narration.speakerCharacterId ??
      episode.characters.find((c) => c.voiceRole === narration.voiceRole)?.id;

    rawClips.push({
      shotId: shot.id,
      voiceRole: narration.voiceRole,
      speakerCharacterId: matchedChar,
      audioPath: clipPath,
      durationSec,
      durationFrames,
    });
  }

  const synced = syncEpisodeTimelineWithClips(episode, measuredFrames);
  const startByShotId = new Map(synced.shots.map((s) => [s.id, s.startFrame]));

  const clips: GeneratedShotAudio[] = rawClips.map((c) => ({
    ...c,
    startFrame: startByShotId.get(c.shotId) ?? 0,
  }));

  const manifest: EpisodeAudioManifest = {
    episodeId: episode.id,
    modelId: verifiedModel.model_id,
    fps: episode.fps,
    totalFrames: synced.totalFrames,
    clips,
  };

  writeFileSync(paths.manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(
    `[Audio] Manifest tersimpan -> ${paths.manifestPath} (${clips.length} klip, ${manifest.totalFrames} frame)`,
  );
  return manifest;
}

async function runCli(): Promise<void> {
  const slug = parseCliFlag(process.argv.slice(2), 'episode');
  const episode = resolveEpisode(slug);
  console.log(`[Audio] Memproses episode "${episode.id}" (${episode.title})`);
  await generateEpisodeAudio(episode);
}

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  runCli().catch((err: unknown) => {
    console.error('[Audio] Gagal:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
