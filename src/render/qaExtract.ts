import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { QA_REVIEW_TOKENS } from '../core/tokens';
import { resolveEpisode } from '../episodes/index';
import { getEpisodeOutputPaths, parseCliFlag } from '../episodes/paths';
import { buildQaFrameSelection, chunkFrames, type QaExtractMode } from './qaPlanner';

interface VideoProbeInfo {
  readonly totalFrames: number;
  readonly fps: number;
}

const WINDOWS_FONT_CANDIDATES: readonly string[] = [
  'C:/Windows/Fonts/consolab.ttf',
  'C:/Windows/Fonts/arialbd.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf',
];

function resolveDrawtextFont(): string | null {
  for (const candidate of WINDOWS_FONT_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function escapeDrawtextFontPath(fontPath: string): string {
  return fontPath.replaceAll('\\', '/').replace(':', '\\:');
}

function probeVideoInfo(mp4Path: string): VideoProbeInfo {
  const raw = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=nb_frames,r_frame_rate',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      mp4Path,
    ],
    { encoding: 'utf8' },
  )
    .trim()
    .split(/\r?\n/);

  const rateParts = (raw[0] ?? '60/1').split('/');
  const num = Number.parseFloat(rateParts[0] ?? '60');
  const den = Number.parseFloat(rateParts[1] ?? '1');
  const fps = den > 0 ? num / den : 60;
  const totalFrames = Number.parseInt(raw[1] ?? '0', 10);

  if (!Number.isFinite(totalFrames) || totalFrames <= 0) {
    throw new Error(`Tidak dapat membaca jumlah frame dari "${mp4Path}".`);
  }
  return { totalFrames, fps };
}

function buildDrawtextFilter(fps: number): string {
  const font = resolveDrawtextFont();
  const fontArg = font !== null ? `fontfile='${escapeDrawtextFontPath(font)}':` : '';
  const roundedFps = Math.max(1, Math.round(fps));
  return (
    `drawtext=${fontArg}` +
    `text='F\\:%{n} | %{eif\\:n/${roundedFps}\\:d}.%{eif\\:mod(n*10/${roundedFps},10)\\:d}s':` +
    `x=8:y=8:fontsize=${QA_REVIEW_TOKENS.labelFontSize}:` +
    `fontcolor=0xffe066:box=1:boxcolor=0x000000@0.78:boxborderw=5`
  );
}

function runFfmpegWithHwFallback(inputArgs: readonly string[], restArgs: readonly string[]): void {
  const hwPrefix = process.platform === 'win32' ? ['-hwaccel', 'd3d11va'] : [];
  if (hwPrefix.length > 0) {
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...hwPrefix, ...inputArgs, ...restArgs], {
        stdio: 'pipe',
      });
      return;
    } catch {
      // Fall through cleanly to software decode when d3d11va surface transfer is unsupported
    }
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputArgs, ...restArgs], {
    stdio: 'inherit',
  });
}

function extractLabeledFrames(
  mp4Path: string,
  framesDir: string,
  selectedFrames: readonly number[],
  mode: QaExtractMode,
  fps: number,
): void {
  const scale = `scale=${QA_REVIEW_TOKENS.tileWidth}:${QA_REVIEW_TOKENS.tileHeight}`;
  const label = buildDrawtextFilter(fps);

  if (mode === 'all') {
    const vf = `${scale},${label}`;
    runFfmpegWithHwFallback(
      ['-i', mp4Path],
      ['-vf', vf, '-fps_mode', 'passthrough', join(framesDir, 'frame_%05d.png')],
    );
    return;
  }

  // Batch select expressions to <= 60 terms so FFmpeg av_expr_parse never hits recursion depth limits
  const batches = chunkFrames(selectedFrames, 60);
  let nextStartNumber = 1;
  for (const batch of batches) {
    const expr = batch.map((f) => `eq(n\\,${f})`).join('+');
    const vf = `${scale},${label},select='${expr}'`;
    runFfmpegWithHwFallback(
      ['-i', mp4Path],
      [
        '-vf',
        vf,
        '-fps_mode',
        'vfr',
        '-start_number',
        String(nextStartNumber),
        join(framesDir, 'frame_%05d.png'),
      ],
    );
    nextStartNumber += batch.length;
  }
}

function buildContactSheets(
  framesDir: string,
  sheetsDir: string,
  extractedCount: number,
  mode: QaExtractMode,
): readonly string[] {
  const cols = mode === 'all' ? QA_REVIEW_TOKENS.allCols : QA_REVIEW_TOKENS.denseCols;
  const rows = mode === 'all' ? QA_REVIEW_TOKENS.allRows : QA_REVIEW_TOKENS.denseRows;
  const perSheet = cols * rows;
  const sheetCount = Math.ceil(extractedCount / perSheet);
  const sheetPattern = join(sheetsDir, 'sheet-%03d.png');

  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-framerate',
      '1',
      '-i',
      join(framesDir, 'frame_%05d.png'),
      '-vf',
      `tile=${cols}x${rows}:padding=6:margin=8:color=0x111218`,
      sheetPattern,
    ],
    { stdio: 'inherit' },
  );

  const paths: string[] = [];
  for (let i = 1; i <= sheetCount; i += 1) {
    paths.push(join(sheetsDir, `sheet-${String(i).padStart(3, '0')}.png`));
  }
  return paths;
}

function runQaExtract(): void {
  const argv = process.argv.slice(2);
  const episode = resolveEpisode(parseCliFlag(argv, 'episode'));
  const modeArg = parseCliFlag(argv, 'mode');
  const mode: QaExtractMode = modeArg === 'all' ? 'all' : 'dense';
  const stepArg = parseCliFlag(argv, 'step');
  const stepFrames = stepArg !== undefined ? Number.parseInt(stepArg, 10) : undefined;

  const paths = getEpisodeOutputPaths(episode.id);
  if (!existsSync(paths.finalMp4Path)) {
    throw new Error(
      `File video belum ditemukan: ${paths.finalMp4Path}. Jalankan "npm run render -- --episode=${episode.id}" terlebih dahulu.`,
    );
  }

  const info = probeVideoInfo(paths.finalMp4Path);
  const selectedFrames = buildQaFrameSelection(episode, info.totalFrames, mode, stepFrames);
  const cols = mode === 'all' ? QA_REVIEW_TOKENS.allCols : QA_REVIEW_TOKENS.denseCols;
  const rows = mode === 'all' ? QA_REVIEW_TOKENS.allRows : QA_REVIEW_TOKENS.denseRows;
  const expectedSheets = chunkFrames(selectedFrames, cols * rows).length;

  rmSync(paths.qaTmpDir, { recursive: true, force: true });
  mkdirSync(paths.qaFramesDir, { recursive: true });
  mkdirSync(paths.qaSheetsDir, { recursive: true });

  console.log(
    `[QA Extract] Episode "${episode.id}" | mode=${mode} | ${selectedFrames.length}/${info.totalFrames} frames -> ${expectedSheets} sheet (${cols}x${rows})`,
  );

  extractLabeledFrames(paths.finalMp4Path, paths.qaFramesDir, selectedFrames, mode, info.fps);
  const sheets = buildContactSheets(paths.qaFramesDir, paths.qaSheetsDir, selectedFrames.length, mode);

  console.log(`[QA Extract] Selesai! Inspeksi seluruh ${sheets.length} lembar grid berikut:`);
  for (const sheet of sheets) {
    console.log(`  - ${sheet}`);
  }
  console.log(
    `\nSetelah semua lembar LULUS audit visual, WAJIB jalankan:\n  npm run qa:clean -- --episode=${episode.id}`,
  );
}

runQaExtract();
