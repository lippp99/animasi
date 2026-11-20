import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

export const IGNORED_ENTRIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'output',
  '.qa-tmp',
  '.cache',
  'coverage',
  '.env',
  '.env.local',
  'package-lock.json',
]);

const FOLDER_ROLES: ReadonlyArray<readonly [string, string]> = [
  ['docs/rules/', 'Aturan permanen proyek (arsitektur, visual Hybrid 2.5D, hardware QSV, audio, episode, QA)'],
  ['src/types/', 'Kontrak tipe TypeScript strict (`common`, `world`, `character`, `camera`, `episode`, `audio`)'],
  ['src/core/', 'Orchestrator engine, timeline 60fps deterministik, token desain, math/PRNG, registry'],
  ['src/characters/', 'Generator Pure 2D Vector Cutout (`512x768`), ekspresi/emote, 2D IK, billboard & crowd'],
  ['src/world/', 'Dunia 3D Low-Poly Toon, `EdgesGeometry` tinta, 3D Cutaway, loader `.glb`, langit & post-processing'],
  ['src/camera/', 'Sutradara kamera 360°, preset sudut, `projectile_pov`, `Camera Impulse Rig`, micro slow-mo'],
  ['src/vfx/', 'Efek aksi deterministik (smear arc, sparks, shockwave, dust puffs, panah, bara api)'],
  ['src/overlay/', 'HUD HTML/CSS/SVG transparan (subtitle tanpa card, ephemeral badge, callout, transisi)'],
  ['src/audio/', 'Integrasi ElevenLabs v4, dynamic voice roles, disk cache, SFX berlapis & auto-ducking'],
  ['src/episodes/', 'Data skenario episode murni (`ain-jalut-1260`), registry, dan scaffolder episode baru'],
  ['src/render/', 'Pipeline render Intel iGPU + FFmpeg QSV, QA frame extract/clean, audit kode, & generator map'],
];

const COUNTED_EXTS = new Set(['.ts', '.md', '.html', '.json']);

function isIgnored(name: string): boolean {
  return IGNORED_ENTRIES.has(name) || /^\.env\..+\.local$/i.test(name);
}

interface WalkStats {
  dirs: number;
  files: number;
  tsFiles: number;
}

function buildTreeLines(dir: string, prefix: string, stats: WalkStats): string[] {
  const entries = readdirSync(dir)
    .filter((name) => !isIgnored(name))
    .map((name) => {
      const full = join(dir, name);
      return { name, full, isDir: statSync(full).isDirectory() };
    })
    .sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));

  const lines: string[] = [];
  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const nextPrefix = prefix + (isLast ? '    ' : '│   ');

    if (entry.isDir) {
      stats.dirs += 1;
      lines.push(`${prefix}${connector}${entry.name}/`);
      lines.push(...buildTreeLines(entry.full, nextPrefix, stats));
    } else {
      stats.files += 1;
      const ext = extname(entry.name);
      if (ext === '.ts') stats.tsFiles += 1;
      const lineTag = COUNTED_EXTS.has(ext)
        ? ` (${readFileSync(entry.full, 'utf8').split(/\r?\n/).length} lines)`
        : '';
      lines.push(`${prefix}${connector}${entry.name}${lineTag}`);
    }
  });
  return lines;
}

export function buildProjectMapMarkdown(rootDir: string): string {
  const stats: WalkStats = { dirs: 0, files: 0, tsFiles: 0 };
  const treeLines = buildTreeLines(rootDir, '', stats);
  const ignoredList = Array.from(IGNORED_ENTRIES).sort().map((i) => `\`${i}\``).join(', ');

  return [
    '# Project Map — Animasi Engine',
    '',
    '> Auto-generated oleh `npm run map` ([generateProjectMap.ts](src/render/generateProjectMap.ts)). Jangan edit manual.',
    '',
    `- **Ringkasan:** \`${stats.dirs}\` folder | \`${stats.files}\` file (\`${stats.tsFiles}\` TypeScript)`,
    `- **Dikecualikan:** ${ignoredList}, dan \`.env.*.local\``,
    '',
    '## Struktur Direktori',
    '',
    '```text',
    'animasi/',
    ...treeLines,
    '```',
    '',
    '## Peran Modul Utama',
    '',
    '| Folder | Tanggung Jawab |',
    '| --- | --- |',
    ...FOLDER_ROLES.map(([folder, role]) => `| \`${folder}\` | ${role} |`),
    '',
  ].join('\n');
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && resolve(entry).endsWith('generateProjectMap.ts');
}

if (isDirectRun()) {
  const root = process.cwd();
  const outPath = join(root, 'PROJECT_MAP.md');
  const markdown = buildProjectMapMarkdown(root);
  writeFileSync(outPath, markdown, 'utf8');
  console.log(`[Map] Generated ${outPath} (${markdown.split(/\r?\n/).length} lines)`);
}
