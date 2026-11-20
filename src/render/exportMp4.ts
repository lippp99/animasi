import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import type { Page } from 'playwright-core';
import type { EpisodeAudioManifest } from '../types/audio';
import type { EngineMeta } from '../types/episode';
import { resolveEpisode } from '../episodes/index';
import { getEpisodeOutputPaths, parseCliFlag } from '../episodes/paths';
import {
  createEnginePage,
  inspectWebGlRenderer,
  launchHardwareRenderBrowser,
} from './browser';
import { FfmpegPipeSession } from './ffmpeg';
import { detectHardwareRenderProfile, type VideoEncoderId } from './hardware';

interface CliOptions {
  readonly episodeSlug: string;
  readonly outPath: string;
  readonly audioPath?: string;
  readonly audioManifestPath?: string;
  readonly maxFrames?: number;
  readonly workers?: number;
  readonly encoder?: VideoEncoderId;
}

function parseCliArgs(argv: readonly string[]): CliOptions {
  const episode = resolveEpisode(parseCliFlag(argv, 'episode'));
  const outputPaths = getEpisodeOutputPaths(episode.id);

  const outArg = parseCliFlag(argv, 'out');
  const audioArg = parseCliFlag(argv, 'audio');
  const manifestArg = parseCliFlag(argv, 'audio-manifest');
  const maxFramesArg = parseCliFlag(argv, 'max-frames');
  const workersArg = parseCliFlag(argv, 'workers');
  const encoderArg = parseCliFlag(argv, 'encoder');

  const encoder: VideoEncoderId | undefined =
    encoderArg === 'h264_qsv' || encoderArg === 'libx264' ? encoderArg : undefined;

  return {
    episodeSlug: episode.id,
    outPath: outArg !== undefined ? resolve(process.cwd(), outArg) : outputPaths.finalMp4Path,
    audioPath: audioArg !== undefined ? resolve(process.cwd(), audioArg) : undefined,
    audioManifestPath:
      manifestArg !== undefined ? resolve(process.cwd(), manifestArg) : undefined,
    maxFrames: maxFramesArg !== undefined ? Number.parseInt(maxFramesArg, 10) : undefined,
    workers: workersArg !== undefined ? Number.parseInt(workersArg, 10) : undefined,
    encoder,
  };
}

function loadAudioManifest(episodeId: string, explicitPath?: string): EpisodeAudioManifest | null {
  const candidate = explicitPath ?? getEpisodeOutputPaths(episodeId).manifestPath;
  if (!existsSync(candidate)) return null;
  const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as EpisodeAudioManifest;
  const validClips = parsed.clips.filter((c) => existsSync(c.audioPath));
  return validClips.length > 0 ? { ...parsed, clips: validClips } : null;
}

async function renderFramesInParallel(
  pages: readonly Page[],
  totalFrames: number,
  maxBufferedFrames: number,
  ffmpeg: FfmpegPipeSession,
): Promise<void> {
  const frameBuffer = new Map<number, Buffer>();
  let nextToClaim = 0;
  let nextToWrite = 0;
  let flushRunning = false;

  const flushSequential = async (): Promise<void> => {
    if (flushRunning) return;
    flushRunning = true;
    try {
      while (frameBuffer.has(nextToWrite)) {
        const png = frameBuffer.get(nextToWrite);
        if (png === undefined) break;
        frameBuffer.delete(nextToWrite);
        await ffmpeg.writeFrame(png);
        nextToWrite += 1;
        if (nextToWrite % 60 === 0 || nextToWrite === totalFrames) {
          const pct = ((nextToWrite / totalFrames) * 100).toFixed(1);
          console.log(`[Render] Frame ${nextToWrite}/${totalFrames} (${pct}%)`);
        }
      }
    } finally {
      flushRunning = false;
    }
  };

  const runWorker = async (page: Page): Promise<void> => {
    while (true) {
      while (frameBuffer.size >= maxBufferedFrames) {
        await flushSequential();
        await new Promise((r) => setTimeout(r, 4));
      }
      const frame = nextToClaim;
      if (frame >= totalFrames) return;
      nextToClaim += 1;

      await page.evaluate((f: number) => {
        window.__ANIMASI__?.seekFrame(f);
      }, frame);
      const frameBuf = await page.screenshot({ type: 'jpeg', quality: 95 });
      frameBuffer.set(frame, frameBuf);
      await flushSequential();
    }
  };

  await Promise.all(pages.map((p) => runWorker(p)));
  await flushSequential();
}

async function runExport(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const startMs = Date.now();
  const hw = detectHardwareRenderProfile({
    requestedWorkers: options.workers,
    forceEncoder: options.encoder,
  });

  console.log(
    `[Hardware] ${hw.logicalCores} threads | ${hw.totalRamGb} GB RAM | Workers: ${hw.workerCount} | Buffer: ${hw.maxBufferedFrames} frames | FFmpeg Encoder: ${hw.encoder} (QSV=${hw.qsvAvailable})`,
  );

  const server = await createServer({
    logLevel: 'silent',
    server: {
      host: '127.0.0.1',
      port: 0,
      hmr: false,
      watch: null,
    },
  });
  await server.listen();

  const address = server.httpServer?.address();
  if (address === null || address === undefined || typeof address === 'string') {
    await server.close();
    throw new Error('Failed to bind ephemeral Vite dev server port.');
  }

  const query = new URLSearchParams({ render: '1', episode: options.episodeSlug });
  const targetUrl = `http://127.0.0.1:${address.port}/?${query.toString()}`;

  const { browser, context } = await launchHardwareRenderBrowser();
  const pages: Page[] = [];

  try {
    const primaryPage = await createEnginePage(context, targetUrl);
    pages.push(primaryPage);

    const glInfo = await inspectWebGlRenderer(primaryPage);
    console.log(`[WebGL] Vendor: ${glInfo.vendor} | Renderer: ${glInfo.renderer}`);
    if (glInfo.isSoftwareFallback) {
      console.warn(
        '[WebGL WARNING] Software renderer terdeteksi (SwiftShader/CPU)! Periksa driver GPU Intel atau flag ANGLE D3D11.',
      );
    }

    let meta = await primaryPage.evaluate((): EngineMeta => {
      if (window.__ANIMASI__ === undefined) throw new Error('Engine bridge __ANIMASI__ is missing.');
      return window.__ANIMASI__.getMeta();
    });

    const manifest = loadAudioManifest(meta.episodeId, options.audioManifestPath);
    for (let i = 1; i < hw.workerCount; i += 1) {
      pages.push(await createEnginePage(context, targetUrl));
    }

    if (manifest !== null) {
      for (const p of pages) {
        meta = await p.evaluate((m: EpisodeAudioManifest): EngineMeta => {
          if (window.__ANIMASI__ === undefined) throw new Error('Engine bridge __ANIMASI__ is missing.');
          window.__ANIMASI__.applyAudioManifest(m);
          return window.__ANIMASI__.getMeta();
        }, manifest);
      }
      console.log(`[Render] Audio manifest aktif: ${manifest.clips.length} klip (${meta.totalFrames} frame)`);
    }

    const totalFrames =
      options.maxFrames !== undefined && Number.isFinite(options.maxFrames)
        ? Math.min(meta.totalFrames, Math.max(1, options.maxFrames))
        : meta.totalFrames;

    console.log(
      `[Render] Episode "${meta.episodeId}" | ${meta.width}x${meta.height} @ ${meta.fps}fps | ${totalFrames} frames`,
    );

    const resolvedSpec = resolveEpisode(options.episodeSlug);
    const ffmpeg = new FfmpegPipeSession({
      outputPath: options.outPath,
      fps: meta.fps,
      totalDurationSec: totalFrames / meta.fps,
      encoder: hw.encoder,
      frameCodec: 'mjpeg',
      audioPath: options.audioPath,
      audioClips: manifest?.clips,
      sfx: resolvedSpec.sfx,
    });

    await renderFramesInParallel(pages, totalFrames, hw.maxBufferedFrames, ffmpeg);
    await ffmpeg.finish();

    const stats = statSync(options.outPath);
    const elapsedSec = (Date.now() - startMs) / 1000;
    const throughputFps = (totalFrames / Math.max(0.1, elapsedSec)).toFixed(1);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(
      `[Render] Done in ${elapsedSec.toFixed(1)}s (${throughputFps} fps) via ${hw.encoder} -> ${options.outPath} (${sizeMb} MB)`,
    );
  } finally {
    for (const p of pages) {
      await p.evaluate(() => window.__ANIMASI__?.dispose()).catch(() => undefined);
    }
    await browser.close();
    await server.close();
  }
}

runExport().catch((err: unknown) => {
  console.error('[Render] Failed:', err);
  process.exit(1);
});
