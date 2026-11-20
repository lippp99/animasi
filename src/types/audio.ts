export type VoiceRole = 'narrator' | 'commander' | 'npc_reactive' | 'npc_secondary';

export interface VoiceRoleSettings {
  readonly role: VoiceRole;
  readonly voiceId: string;
  readonly stability: number;
  readonly similarityBoost: number;
  readonly style: number;
  readonly useSpeakerBoost: boolean;
}

export interface ShotNarrationSpec {
  readonly voiceRole: VoiceRole;
  readonly narrationText: string;
  readonly speakerCharacterId?: string;
  readonly audioPath?: string;
  readonly autoSyncDuration?: boolean;
  readonly languageCode?: string;
}

export interface ElevenLabsModelInfo {
  readonly model_id: string;
  readonly name: string;
  readonly can_do_text_to_speech: boolean;
  readonly can_use_style?: boolean;
  readonly description?: string;
}

export interface ElevenLabsVoiceInfo {
  readonly voice_id: string;
  readonly name: string;
  readonly category?: string;
  readonly description?: string | null;
  readonly labels?: Readonly<Record<string, string>>;
}

export interface GeneratedShotAudio {
  readonly shotId: string;
  readonly voiceRole: VoiceRole;
  readonly speakerCharacterId?: string;
  readonly audioPath: string;
  readonly startFrame: number;
  readonly durationFrames: number;
  readonly durationSec: number;
}

export interface EpisodeAudioManifest {
  readonly episodeId: string;
  readonly modelId: string;
  readonly fps: number;
  readonly totalFrames: number;
  readonly clips: readonly GeneratedShotAudio[];
}
