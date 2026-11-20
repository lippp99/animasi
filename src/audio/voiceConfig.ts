import 'dotenv/config';
import type { VoiceRole, VoiceRoleSettings } from '../types/audio';

export const ELEVENLABS_DEFAULTS = {
  baseUrl: 'https://api.elevenlabs.io/v1',
  preferredModels: ['eleven_v4', 'eleven_v3', 'eleven_multilingual_v2'] as readonly string[],
  defaultModelId: 'eleven_v4',
  outputFormat: 'mp3_44100_128',
  defaultLanguageCode: 'id',
  cacheDir: 'output/audio-cache',
  episodeAudioDir: 'output/audio',
  auditionDir: 'output/voice-audition',
  shotTailPaddingFrames: 14,
} as const;

const ROLE_ENV_KEYS: Readonly<Record<VoiceRole, string>> = {
  narrator: 'VOICE_ID_NARRATOR',
  commander: 'VOICE_ID_COMMANDER',
  npc_reactive: 'VOICE_ID_NPC',
  npc_secondary: 'VOICE_ID_NPC_SECONDARY',
};

const ROLE_PRESETS: Readonly<Record<VoiceRole, Omit<VoiceRoleSettings, 'voiceId'>>> = {
  narrator: {
    role: 'narrator',
    stability: 0.56,
    similarityBoost: 0.78,
    style: 0.25,
    useSpeakerBoost: true,
  },
  commander: {
    role: 'commander',
    stability: 0.44,
    similarityBoost: 0.82,
    style: 0.45,
    useSpeakerBoost: true,
  },
  npc_reactive: {
    role: 'npc_reactive',
    stability: 0.34,
    similarityBoost: 0.76,
    style: 0.55,
    useSpeakerBoost: true,
  },
  npc_secondary: {
    role: 'npc_secondary',
    stability: 0.46,
    similarityBoost: 0.75,
    style: 0.35,
    useSpeakerBoost: true,
  },
};

export function getConfiguredApiKey(): string {
  const raw = process.env.ELEVENLABS_API_KEY?.trim() ?? '';
  if (raw.length === 0 || raw === 'your_api_key_here') {
    throw new Error(
      'ELEVENLABS_API_KEY belum diisi. Buka file ".env" di root proyek animasi, ganti "your_api_key_here" dengan API key ElevenLabs Anda, lalu jalankan ulang perintah ini.',
    );
  }
  return raw;
}

export function getConfiguredModelId(): string {
  const fromEnv = process.env.ELEVENLABS_MODEL_ID?.trim() ?? '';
  return fromEnv.length > 0 ? fromEnv : ELEVENLABS_DEFAULTS.defaultModelId;
}

export function getVoiceRoleConfig(role: VoiceRole, overrideVoiceId?: string): VoiceRoleSettings {
  const envKey = ROLE_ENV_KEYS[role];
  const envVoice = process.env[envKey]?.trim() ?? '';
  const narratorFallback = process.env.VOICE_ID_NARRATOR?.trim() ?? '';
  const voiceId = overrideVoiceId?.trim() || envVoice || narratorFallback;
  const preset = ROLE_PRESETS[role];

  return {
    ...preset,
    voiceId,
  };
}

export function getRoleEnvKey(role: VoiceRole): string {
  return ROLE_ENV_KEYS[role];
}
