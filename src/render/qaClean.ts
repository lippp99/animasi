import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveEpisode } from '../episodes/index';
import { getEpisodeOutputPaths, parseCliFlag } from '../episodes/paths';

interface DirStats {
  readonly files: number;
  readonly bytes: number;
}

function measureDirectory(dirPath: string): DirStats {
  if (!existsSync(dirPath)) {
    return { files: 0, bytes: 0 };
  }
  let files = 0;
  let bytes = 0;

  for (const entry of readdirSync(dirPath)) {
    const full = join(dirPath, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      const child = measureDirectory(full);
      files += child.files;
      bytes += child.bytes;
    } else {
      files += 1;
      bytes += st.size;
    }
  }
  return { files, bytes };
}

function runQaClean(): void {
  const argv = process.argv.slice(2);
  const episode = resolveEpisode(parseCliFlag(argv, 'episode'));
  const paths = getEpisodeOutputPaths(episode.id);

  const before = measureDirectory(paths.qaTmpDir);
  if (existsSync(paths.qaTmpDir)) {
    rmSync(paths.qaTmpDir, { recursive: true, force: true });
    const freedMb = (before.bytes / (1024 * 1024)).toFixed(2);
    console.log(
      `[QA Clean] Dihapus: ${paths.qaTmpDir} (${before.files} file sementara, ${freedMb} MB dibersihkan)`,
    );
  } else {
    console.log(`[QA Clean] Folder sementara sudah bersih: ${paths.qaTmpDir}`);
  }

  if (existsSync(paths.finalMp4Path)) {
    const mp4SizeMb = (statSync(paths.finalMp4Path).size / (1024 * 1024)).toFixed(2);
    console.log(`[QA Clean] Verifikasi OK -> ${paths.finalMp4Path} tetap utuh (${mp4SizeMb} MB)`);
  } else {
    console.warn(`[QA Clean WARNING] ${paths.finalMp4Path} tidak ditemukan.`);
  }
}

runQaClean();
