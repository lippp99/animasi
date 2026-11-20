import { execFileSync } from 'node:child_process';
import { cpus, totalmem } from 'node:os';
import { HARDWARE_RENDER_TOKENS } from '../core/tokens';

export type VideoEncoderId = 'h264_qsv' | 'libx264';

export interface ConcurrencyProfile {
  readonly logicalCores: number;
  readonly totalRamGb: number;
  readonly workerCount: number;
  readonly maxBufferedFrames: number;
}

export interface HardwareRenderProfile extends ConcurrencyProfile {
  readonly encoder: VideoEncoderId;
  readonly qsvAvailable: boolean;
}

export function computeConcurrencyProfile(
  logicalCores: number,
  totalRamGb: number,
  requestedWorkers?: number,
): ConcurrencyProfile {
  const isHighRam = totalRamGb >= HARDWARE_RENDER_TOKENS.highRamThresholdGb;
  const maxDefault = isHighRam
    ? HARDWARE_RENDER_TOKENS.maxWorkersHighRam
    : HARDWARE_RENDER_TOKENS.maxWorkersLowRam;
  const autoWorkers = Math.max(1, Math.min(maxDefault, Math.floor(logicalCores / 3)));
  const workerCount =
    requestedWorkers !== undefined && Number.isFinite(requestedWorkers)
      ? Math.max(1, Math.min(8, Math.floor(requestedWorkers)))
      : autoWorkers;

  const maxBufferedFrames = isHighRam
    ? HARDWARE_RENDER_TOKENS.highRamBufferFrames
    : HARDWARE_RENDER_TOKENS.lowRamBufferFrames;

  return {
    logicalCores,
    totalRamGb,
    workerCount,
    maxBufferedFrames,
  };
}

/**
 * Probes Intel Quick Sync Video (h264_qsv) by encoding a tiny 2-frame synthetic surface.
 * Guarantees QSV works on the real local GPU driver before choosing hardware encoding.
 */
export function probeH264QsvSupport(): boolean {
  try {
    execFileSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'lavfi',
        '-i',
        'color=c=black:s=128x128:r=30:d=0.07',
        '-c:v',
        'h264_qsv',
        '-preset',
        HARDWARE_RENDER_TOKENS.qsvPreset,
        '-global_quality',
        String(HARDWARE_RENDER_TOKENS.qsvGlobalQuality),
        '-pix_fmt',
        HARDWARE_RENDER_TOKENS.qsvPixelFormat,
        '-f',
        'null',
        '-',
      ],
      { stdio: 'ignore', timeout: 8000 },
    );
    return true;
  } catch {
    return false;
  }
}

export function detectHardwareRenderProfile(options?: {
  readonly requestedWorkers?: number;
  readonly forceEncoder?: VideoEncoderId;
}): HardwareRenderProfile {
  const logicalCores = Math.max(1, cpus().length);
  const totalRamGb = Math.round((totalmem() / (1024 * 1024 * 1024)) * 10) / 10;
  const concurrency = computeConcurrencyProfile(
    logicalCores,
    totalRamGb,
    options?.requestedWorkers,
  );

  const qsvAvailable = probeH264QsvSupport();
  let encoder: VideoEncoderId = qsvAvailable ? 'h264_qsv' : 'libx264';
  if (options?.forceEncoder === 'libx264') {
    encoder = 'libx264';
  } else if (options?.forceEncoder === 'h264_qsv' && qsvAvailable) {
    encoder = 'h264_qsv';
  }

  return {
    ...concurrency,
    encoder,
    qsvAvailable,
  };
}
