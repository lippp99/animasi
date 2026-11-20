import { join, resolve } from 'node:path';

export interface EpisodeOutputPaths {
  readonly rootDir: string;
  readonly audioDir: string;
  readonly manifestPath: string;
  readonly previewDir: string;
  readonly finalMp4Path: string;
  readonly qaTmpDir: string;
  readonly qaFramesDir: string;
  readonly qaSheetsDir: string;
}

/**
 * Parses both `--name=value` and `--name value` CLI argument styles cleanly.
 */
export function parseCliFlag(argv: readonly string[], flagName: string): string | undefined {
  const prefix = `--${flagName}=`;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg.startsWith(prefix)) {
      const val = arg.slice(prefix.length).trim();
      return val.length > 0 ? val : undefined;
    }
    if (arg === `--${flagName}`) {
      const next = argv[i + 1]?.trim();
      return next !== undefined && next.length > 0 && !next.startsWith('--') ? next : undefined;
    }
  }
  return undefined;
}

export function getEpisodeOutputPaths(slug: string, cwd: string = process.cwd()): EpisodeOutputPaths {
  const rootDir = resolve(cwd, 'output', 'episodes', slug);
  const audioDir = join(rootDir, 'audio');
  const qaTmpDir = join(rootDir, '.qa-tmp');
  return {
    rootDir,
    audioDir,
    manifestPath: join(audioDir, 'manifest.json'),
    previewDir: join(rootDir, 'preview'),
    finalMp4Path: join(rootDir, 'final.mp4'),
    qaTmpDir,
    qaFramesDir: join(qaTmpDir, 'frames'),
    qaSheetsDir: join(qaTmpDir, 'sheets'),
  };
}
