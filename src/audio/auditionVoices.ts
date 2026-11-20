import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ElevenLabsVoiceInfo, VoiceRole } from '../types/audio';
import { ElevenLabsClient } from './elevenLabsClient';
import { ELEVENLABS_DEFAULTS, getRoleEnvKey, getVoiceRoleConfig } from './voiceConfig';

interface AuditionBrief {
  readonly role: VoiceRole;
  readonly count: number;
  readonly keywords: readonly string[];
  readonly sampleText: string;
}

const AUDITION_BRIEFS: readonly AuditionBrief[] = [
  {
    role: 'narrator',
    count: 3,
    keywords: ['narrative', 'story', 'deep', 'documentary', 'calm', 'warm', 'mature'],
    sampleText:
      'Di balik tembok batu berusia seribu tahun, satu malam saja cukup untuk membalikkan sejarah dunia.',
  },
  {
    role: 'commander',
    count: 2,
    keywords: ['authoritative', 'strong', 'raspy', 'confident', 'epic', 'deep', 'male'],
    sampleText:
      'Jika lautan dikunci rantai besi, maka kita tarik tujuh puluh dua kapal perang melewati bukit!',
  },
  {
    role: 'npc_reactive',
    count: 2,
    keywords: ['expressive', 'excited', 'young', 'energetic', 'animated', 'dramatic'],
    sampleText:
      'Lihat ke arah bukit! Mustahil... armada musuh muncul dari daratan?!',
  },
];

function scoreVoiceForBrief(voice: ElevenLabsVoiceInfo, keywords: readonly string[]): number {
  const haystack = [
    voice.name,
    voice.description ?? '',
    voice.category ?? '',
    ...Object.values(voice.labels ?? {}),
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) score += 2;
  }
  return score;
}

function sanitizeFilename(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28);
}

function pickCandidates(
  voices: readonly ElevenLabsVoiceInfo[],
  brief: AuditionBrief,
  usedIds: Set<string>,
): readonly ElevenLabsVoiceInfo[] {
  const ranked = [...voices].sort((a, b) => {
    const scoreDiff = scoreVoiceForBrief(b, brief.keywords) - scoreVoiceForBrief(a, brief.keywords);
    return scoreDiff !== 0 ? scoreDiff : a.name.localeCompare(b.name);
  });

  const chosen: ElevenLabsVoiceInfo[] = [];
  for (const voice of ranked) {
    if (chosen.length >= brief.count) break;
    if (!usedIds.has(voice.voice_id)) {
      chosen.push(voice);
      usedIds.add(voice.voice_id);
    }
  }
  // If account has fewer unique voices than total slots, allow reuse to complete audition set
  for (const voice of ranked) {
    if (chosen.length >= brief.count) break;
    if (!chosen.some((v) => v.voice_id === voice.voice_id)) {
      chosen.push(voice);
    }
  }
  return chosen;
}

async function runVoiceAudition(): Promise<void> {
  const client = new ElevenLabsClient();

  console.log('=== 1. Verifikasi Model TTS Aktif (GET /v1/models) ===');
  const models = await client.listModels();
  for (const m of models) {
    console.log(`  - ${m.model_id} (${m.name})`);
  }
  const activeModel = await client.resolveVerifiedModel();
  console.log(`\nModel terpilih: ${activeModel.model_id} (${activeModel.name})`);

  console.log('\n=== 2. Daftar Suara Tersedia (GET /v1/voices) ===');
  const voices = await client.listVoices();
  console.log(`Total suara terdeteksi: ${voices.length}`);
  if (voices.length === 0) {
    throw new Error('Akun ElevenLabs Anda tidak memiliki suara yang tersedia pada GET /v1/voices.');
  }

  const outDir = resolve(process.cwd(), ELEVENLABS_DEFAULTS.auditionDir);
  mkdirSync(outDir, { recursive: true });

  console.log('\n=== 3. Generate Sampel Audisi Bahasa Indonesia ===');
  const usedIds = new Set<string>();
  const envRecommendations: string[] = [];

  for (const brief of AUDITION_BRIEFS) {
    const candidates = pickCandidates(voices, brief, usedIds);
    const settings = getVoiceRoleConfig(brief.role);

    for (let i = 0; i < candidates.length; i += 1) {
      const voice = candidates[i];
      if (voice === undefined) continue;

      const fileName = `${brief.role}_${i + 1}_${sanitizeFilename(voice.name)}.mp3`;
      const outputPath = join(outDir, fileName);

      const res = await client.synthesizeSpeech({
        text: brief.sampleText,
        voiceId: voice.voice_id,
        settings,
        modelId: activeModel.model_id,
        languageCode: ELEVENLABS_DEFAULTS.defaultLanguageCode,
        outputPath,
        supportsStyle: activeModel.can_use_style === true,
      });

      const status = res.fromCache ? 'CACHE' : 'NEW';
      console.log(`  [${status}] ${fileName} | voice_id=${voice.voice_id} (${voice.name})`);

      if (i === 0) {
        envRecommendations.push(`${getRoleEnvKey(brief.role)}=${voice.voice_id} # ${voice.name}`);
      }
    }
  }

  console.log(`\nSampel audisi tersimpan di: ${outDir}`);
  console.log('\nRekomendasi cepat untuk ditempel di file .env (ganti sesuai pilihan telinga Anda):');
  for (const line of envRecommendations) {
    console.log(`  ${line}`);
  }
}

runVoiceAudition().catch((err: unknown) => {
  console.error('[Voice Audition] Gagal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
