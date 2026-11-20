import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseCliFlag } from './paths';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toConstName(slug: string): string {
  return `EPISODE_${slug.replaceAll('-', '_').toUpperCase()}`;
}

function toDisplayTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w.length > 0 ? `${w[0]?.toUpperCase() ?? ''}${w.slice(1)}` : w))
    .join(' ');
}

function buildMetaTemplate(slug: string, title: string): string {
  return `import type { CharacterSpec, CrowdSpec } from '../../types/character';
import type { HudBadge } from '../../types/episode';
import type { WorldSpec } from '../../types/world';
import { RENDER_CONFIG } from '../../core/tokens';

export const EPISODE_META = {
  id: '${slug}',
  title: '${title.replaceAll("'", "\\'")}',
  fps: RENDER_CONFIG.fps,
  totalFrames: 360,
  badge: {
    era: 'TAHUN / ERA',
    location: 'LOKASI UTAMA',
  } satisfies HudBadge,
} as const;

export const EPISODE_WORLD: WorldSpec = {
  defaultMood: 'dawn',
  defaultWeather: 'dust_wind',
  terrain: {
    groundColor: 0x6b5842,
    groundAccent: 0x453728,
    waterColor: 0x1d4b6e,
    waterLevel: -0.5,
    showWater: false,
    seed: 1001,
  },
  props: [
    { kind: 'obelisk', position: [-3.5, 0, -6.5], rotationY: 0.2, scale: 1.0 },
    { kind: 'banner_pole', position: [3.2, 0, -3.2], rotationY: -0.2, scale: 1.0, accentColor: 0xc0392b },
  ],
};

export const EPISODE_CHARACTERS: readonly CharacterSpec[] = [
  {
    id: 'lead',
    name: 'Tokoh Utama',
    voiceRole: 'commander',
    bodyColor: 0x2c5c8a,
    trimColor: 0xe6b84c,
    scale: 1.08,
    seed: 101,
    accessories: ['cape', 'chest_armor', 'sash_belt', 'map_scroll'],
    beats: [
      {
        startFrame: 0,
        endFrame: 180,
        fromPosition: [-0.6, 0, 1.8],
        toPosition: [0.0, 0, 1.2],
        facingYaw: 0.1,
        action: 'walk',
        expression: 'determined',
      },
      {
        startFrame: 180,
        endFrame: 360,
        fromPosition: [0.0, 0, 1.2],
        toPosition: [0.2, 0, 1.0],
        facingYaw: 0.15,
        action: 'explain_gesture',
        expression: 'determined',
      },
    ],
  },
];

export const EPISODE_CROWDS: readonly CrowdSpec[] = [];
`;
}

function buildNarrationTemplate(): string {
  return `import type { ShotNarrationSpec } from '../../types/audio';
import type { AudioCue } from '../../types/common';
import type { InfographicCallout, SubtitleCue } from '../../types/episode';

export const SHOT_NARRATIONS: Readonly<Record<string, ShotNarrationSpec>> = {
  'shot-1-hook': {
    voiceRole: 'narrator',
    narrationText: 'Di tempat inilah sebuah peristiwa besar dimulai.',
    autoSyncDuration: true,
    languageCode: 'id',
  },
  'shot-2-climax': {
    voiceRole: 'commander',
    speakerCharacterId: 'lead',
    narrationText: 'Kita tidak akan mundur selangkah pun hari ini!',
    autoSyncDuration: true,
    languageCode: 'id',
  },
};

export const EPISODE_SUBTITLES: readonly SubtitleCue[] = [
  {
    startFrame: 10,
    endFrame: 172,
    text: 'Di tempat inilah sebuah peristiwa besar dimulai.',
    highlightWord: 'peristiwa besar',
  },
  {
    startFrame: 188,
    endFrame: 350,
    speaker: 'TOKOH UTAMA',
    text: 'Kita tidak akan mundur selangkah pun hari ini!',
    highlightWord: 'mundur',
  },
];

export const EPISODE_CALLOUTS: readonly InfographicCallout[] = [];
export const EPISODE_AUDIO_CUES: readonly AudioCue[] = [];
`;
}

function buildShotsTemplate(): string {
  return `import type { ShotSpec } from '../../types/episode';
import { SHOT_NARRATIONS } from './narration';

export const EPISODE_SHOTS: readonly ShotSpec[] = [
  {
    id: 'shot-1-hook',
    startFrame: 0,
    endFrame: 180,
    mood: 'dawn',
    weather: 'dust_wind',
    weatherIntensity: 0.65,
    camera: {
      angle: 'epic_wide',
      motion: 'dolly_in',
      target: [0, 0.8, 0.5],
      motionAmplitude: 1.0,
      easing: 'easeInOutSine',
      traumaBase: 0.06,
      transitionIn: 'fade_black',
      transitionFrames: 18,
    },
    narration: SHOT_NARRATIONS['shot-1-hook'],
  },
  {
    id: 'shot-2-climax',
    startFrame: 180,
    endFrame: 360,
    mood: 'war_dusk',
    weather: 'embers',
    weatherIntensity: 0.75,
    camera: {
      angle: 'low_angle',
      motion: 'orbit',
      target: [0, 0.6, 1.0],
      focusCharacterId: 'lead',
      motionAmplitude: 0.9,
      easing: 'easeInOutCubic',
      traumaBase: 0.09,
      transitionIn: 'whip_pan',
      transitionFrames: 14,
    },
    narration: SHOT_NARRATIONS['shot-2-climax'],
  },
];
`;
}

function buildIndexTemplate(constName: string): string {
  return `import type { EpisodeSpec } from '../../types/episode';
import {
  EPISODE_CHARACTERS,
  EPISODE_CROWDS,
  EPISODE_META,
  EPISODE_WORLD,
} from './meta';
import {
  EPISODE_AUDIO_CUES,
  EPISODE_CALLOUTS,
  EPISODE_SUBTITLES,
} from './narration';
import { EPISODE_SHOTS } from './shots';

export const ${constName}: EpisodeSpec = {
  ...EPISODE_META,
  world: EPISODE_WORLD,
  characters: EPISODE_CHARACTERS,
  crowds: EPISODE_CROWDS,
  shots: EPISODE_SHOTS,
  subtitles: EPISODE_SUBTITLES,
  callouts: EPISODE_CALLOUTS,
  audioCues: EPISODE_AUDIO_CUES,
};
`;
}

function registerInEpisodesIndex(slug: string, constName: string): void {
  const indexPath = resolve(process.cwd(), 'src', 'episodes', 'index.ts');
  const current = readFileSync(indexPath, 'utf8');
  const importLine = `import { ${constName} } from './${slug}/index';`;

  if (current.includes(importLine)) return;

  const updated = current
    .replace('// [AUTO-IMPORT]', `${importLine}\n// [AUTO-IMPORT]`)
    .replace('// [AUTO-REGISTER]', `${constName},\n  // [AUTO-REGISTER]`);

  if (updated === current) {
    throw new Error('Marker // [AUTO-IMPORT] atau // [AUTO-REGISTER] tidak ditemukan di src/episodes/index.ts');
  }
  writeFileSync(indexPath, updated, 'utf8');
}

function runScaffold(): void {
  const argv = process.argv.slice(2);
  const slug = parseCliFlag(argv, 'slug');
  if (slug === undefined || !SLUG_PATTERN.test(slug)) {
    throw new Error(
      'Argumen --slug wajib diisi dalam format kebab-case (contoh: npm run episode:new -- --slug=218sm-hannibal-alpen).',
    );
  }

  const title = parseCliFlag(argv, 'title') ?? toDisplayTitle(slug);
  const episodeDir = resolve(process.cwd(), 'src', 'episodes', slug);
  if (existsSync(episodeDir)) {
    throw new Error(`Folder episode sudah ada: ${episodeDir}`);
  }

  const constName = toConstName(slug);
  mkdirSync(episodeDir, { recursive: true });
  writeFileSync(join(episodeDir, 'meta.ts'), buildMetaTemplate(slug, title), 'utf8');
  writeFileSync(join(episodeDir, 'narration.ts'), buildNarrationTemplate(), 'utf8');
  writeFileSync(join(episodeDir, 'shots.ts'), buildShotsTemplate(), 'utf8');
  writeFileSync(join(episodeDir, 'index.ts'), buildIndexTemplate(constName), 'utf8');

  registerInEpisodesIndex(slug, constName);

  console.log(`[Episode] Kerangka episode "${slug}" dibuat di: ${episodeDir}`);
  console.log('[Episode] Terdaftar otomatis di src/episodes/index.ts');
  console.log(`  - Generate audio: npm run audio:generate -- --episode=${slug}`);
  console.log(`  - Render MP4:     npm run render -- --episode=${slug}`);
}

runScaffold();
