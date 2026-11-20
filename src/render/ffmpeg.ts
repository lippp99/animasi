import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { GeneratedShotAudio } from '../types/audio';
import type { SfxTrackSpec } from '../types/common';
import { HARDWARE_RENDER_TOKENS, RENDER_CONFIG } from '../core/tokens';
import { buildLayeredAudioGraph } from '../audio/sfxMixer';
import type { VideoEncoderId } from './hardware';

export interface FfmpegSessionOptions {
  readonly outputPath: string;
  readonly fps: number;
  readonly totalDurationSec: number;
  readonly encoder: VideoEncoderId;
  readonly frameCodec?: 'png' | 'mjpeg';
  readonly audioPath?: string;
  readonly audioClips?: readonly GeneratedShotAudio[];
  readonly sfx?: SfxTrackSpec;
}

export function buildVideoEncoderArgs(encoder: VideoEncoderId): readonly string[] {
  if (encoder === 'h264_qsv') {
    return [
      '-c:v',
      'h264_qsv',
      '-preset',
      HARDWARE_RENDER_TOKENS.qsvPreset,
      '-global_quality',
      String(HARDWARE_RENDER_TOKENS.qsvGlobalQuality),
      '-pix_fmt',
      HARDWARE_RENDER_TOKENS.qsvPixelFormat,
    ];
  }
  return [
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    String(RENDER_CONFIG.crf),
    '-pix_fmt',
    RENDER_CONFIG.pixelFormat,
  ];
}

export class FfmpegPipeSession {
  private readonly proc: ChildProcessWithoutNullStreams;
  private readonly stderrLines: string[] = [];
  private readonly exitPromise: Promise<void>;

  public constructor(options: FfmpegSessionOptions) {
    mkdirSync(dirname(options.outputPath), { recursive: true });

    const args: string[] = [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-vcodec',
      options.frameCodec ?? 'mjpeg',
      '-r',
      String(options.fps),
      '-i',
      '-',
    ];

    const audioGraph = buildLayeredAudioGraph({
      fps: options.fps,
      totalDurationSec: options.totalDurationSec,
      audioPath: options.audioPath,
      voiceClips: options.audioClips,
      sfx: options.sfx,
    });

    if (audioGraph !== null) {
      args.push(
        ...audioGraph.extraInputArgs,
        '-filter_complex',
        audioGraph.filterComplex,
        '-map',
        '0:v:0',
        '-map',
        audioGraph.audioMapLabel,
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-shortest',
      );
    }

    args.push(
      ...buildVideoEncoderArgs(options.encoder),
      '-movflags',
      '+faststart',
      '-r',
      String(options.fps),
      options.outputPath,
    );

    this.proc = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdin.on('error', (err) => {
      this.stderrLines.push(`stdin error: ${err.message}`);
    });
    this.proc.stderr.on('data', (chunk: Buffer) => {
      this.stderrLines.push(chunk.toString('utf8'));
    });

    this.exitPromise = new Promise<void>((resolve, reject) => {
      this.proc.on('error', (err) => reject(err));
      this.proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${this.stderrLines.join('')}`));
        }
      });
    });
  }

  public async writeFrame(pngBuffer: Buffer): Promise<void> {
    if (!this.proc.stdin.write(pngBuffer)) {
      await new Promise<void>((resolve) => {
        this.proc.stdin.once('drain', () => resolve());
      });
    }
  }

  public async finish(): Promise<void> {
    this.proc.stdin.end();
    await this.exitPromise;
  }
}
