import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type {
  ElevenLabsModelInfo,
  ElevenLabsVoiceInfo,
  VoiceRoleSettings,
} from '../types/audio';
import {
  ELEVENLABS_DEFAULTS,
  getConfiguredApiKey,
  getConfiguredModelId,
} from './voiceConfig';

export interface SynthesizeSpeechInput {
  readonly text: string;
  readonly voiceId: string;
  readonly settings: VoiceRoleSettings;
  readonly modelId?: string;
  readonly languageCode?: string;
  readonly outputPath: string;
  readonly supportsStyle?: boolean;
}

export interface SynthesizeSpeechResult {
  readonly outputPath: string;
  readonly cachePath: string;
  readonly fromCache: boolean;
  readonly modelId: string;
}

interface VoicesApiResponse {
  readonly voices: readonly ElevenLabsVoiceInfo[];
}

export function computeSpeechCacheKey(params: {
  readonly modelId: string;
  readonly voiceId: string;
  readonly text: string;
  readonly stability: number;
  readonly similarityBoost: number;
  readonly style: number;
  readonly languageCode: string;
}): string {
  const payload = JSON.stringify([
    params.modelId,
    params.voiceId,
    params.text.trim(),
    params.stability,
    params.similarityBoost,
    params.style,
    params.languageCode,
    ELEVENLABS_DEFAULTS.outputFormat,
  ]);
  return createHash('sha256').update(payload).digest('hex').slice(0, 24);
}

export class ElevenLabsClient {
  private readonly apiKey: string;
  private readonly cacheDir: string;

  public constructor(apiKey?: string, cacheDir?: string) {
    this.apiKey = apiKey ?? getConfiguredApiKey();
    this.cacheDir = resolve(process.cwd(), cacheDir ?? ELEVENLABS_DEFAULTS.cacheDir);
  }

  public async listModels(): Promise<readonly ElevenLabsModelInfo[]> {
    const res = await fetch(`${ELEVENLABS_DEFAULTS.baseUrl}/models`, {
      method: 'GET',
      headers: { 'xi-api-key': this.apiKey },
    });
    if (!res.ok) {
      throw new Error(`ElevenLabs GET /v1/models gagal (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as ElevenLabsModelInfo[];
    return data.filter((m) => m.can_do_text_to_speech);
  }

  public async listVoices(): Promise<readonly ElevenLabsVoiceInfo[]> {
    const res = await fetch(`${ELEVENLABS_DEFAULTS.baseUrl}/voices`, {
      method: 'GET',
      headers: { 'xi-api-key': this.apiKey },
    });
    if (!res.ok) {
      throw new Error(`ElevenLabs GET /v1/voices gagal (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as VoicesApiResponse;
    return data.voices;
  }

  /**
   * Verifies configured model_id against live GET /v1/models so we never call an invalid model.
   */
  public async resolveVerifiedModel(): Promise<ElevenLabsModelInfo> {
    const models = await this.listModels();
    const requested = getConfiguredModelId();
    const exact = models.find((m) => m.model_id === requested);
    if (exact !== undefined) return exact;

    for (const preferred of ELEVENLABS_DEFAULTS.preferredModels) {
      const match = models.find((m) => m.model_id === preferred);
      if (match !== undefined) return match;
    }

    const first = models[0];
    if (first === undefined) {
      throw new Error('Tidak ada model Text-to-Speech aktif pada akun ElevenLabs Anda.');
    }
    return first;
  }

  public async synthesizeSpeech(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
    if (input.voiceId.trim().length === 0) {
      throw new Error(
        `Voice ID kosong untuk peran "${input.settings.role}". Jalankan "npm run voice:audition" lalu isi VOICE_ID_* di .env.`,
      );
    }

    const modelId = input.modelId ?? getConfiguredModelId();
    const languageCode = input.languageCode ?? ELEVENLABS_DEFAULTS.defaultLanguageCode;
    const hash = computeSpeechCacheKey({
      modelId,
      voiceId: input.voiceId,
      text: input.text,
      stability: input.settings.stability,
      similarityBoost: input.settings.similarityBoost,
      style: input.settings.style,
      languageCode,
    });

    mkdirSync(this.cacheDir, { recursive: true });
    mkdirSync(dirname(input.outputPath), { recursive: true });
    const cachePath = join(this.cacheDir, `${hash}.mp3`);

    if (existsSync(cachePath)) {
      copyFileSync(cachePath, input.outputPath);
      return { outputPath: input.outputPath, cachePath, fromCache: true, modelId };
    }

    const voiceSettings: Record<string, number | boolean> = {
      stability: input.settings.stability,
      similarity_boost: input.settings.similarityBoost,
      use_speaker_boost: input.settings.useSpeakerBoost,
    };
    if (input.supportsStyle === true && input.settings.style > 0) {
      voiceSettings.style = input.settings.style;
    }

    const url =
      `${ELEVENLABS_DEFAULTS.baseUrl}/text-to-speech/${encodeURIComponent(input.voiceId)}` +
      `?output_format=${ELEVENLABS_DEFAULTS.outputFormat}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: input.text,
        model_id: modelId,
        language_code: languageCode,
        voice_settings: voiceSettings,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `ElevenLabs TTS gagal untuk voice "${input.voiceId}" (${res.status}): ${await res.text()}`,
      );
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(cachePath, audioBuffer);
    writeFileSync(input.outputPath, audioBuffer);

    return { outputPath: input.outputPath, cachePath, fromCache: false, modelId };
  }
}
