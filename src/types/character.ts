import type { ColorHex, Vec3Tuple } from './common';
import type { VoiceRole } from './audio';

export type ExpressionPreset =
  | 'neutral'
  | 'determined'
  | 'shocked'
  | 'angry'
  | 'happy'
  | 'scheming'
  | 'worried';

export type EyeState =
  | 'normal'
  | 'wide_shock'
  | 'squint'
  | 'closed_line'
  | 'angry'
  | 'x_dead'
  | 'symbol';

export type BrowState =
  | 'neutral'
  | 'furrowed'
  | 'worried_arch'
  | 'skeptical_one_up';

export type MouthState =
  | 'talk_neutral'
  | 'smirk'
  | 'shout_open'
  | 'grit_teeth'
  | 'jaw_drop';

export type ComicEmoteType =
  | 'none'
  | 'sweat_drop'
  | 'anger_vein'
  | 'exclaim'
  | 'question'
  | 'shock_puff';

export type AccessoryId =
  | 'turban'
  | 'crown'
  | 'war_helmet'
  | 'mongol_hat'
  | 'plumed_hat'
  | 'headband'
  | 'cape'
  | 'scarf'
  | 'chest_armor'
  | 'sash_belt'
  | 'scabbard'
  | 'back_shield'
  | 'glasses'
  | 'sword'
  | 'spear'
  | 'shield'
  | 'bow'
  | 'torch'
  | 'map_scroll'
  | 'banner';

export type CharacterActionType =
  | 'idle_breathing'
  | 'walk'
  | 'run_sprint'
  | 'sneak'
  | 'kneel_inspect'
  | 'point_command'
  | 'combat_slash_or_block'
  | 'draw_bow'
  | 'stagger_knockback'
  | 'explain_gesture'
  | 'riding_bob';

export interface CharacterBeat {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly fromPosition: Vec3Tuple;
  readonly toPosition: Vec3Tuple;
  readonly facingYaw: number;
  readonly action: CharacterActionType;
  readonly expression: ExpressionPreset;
  readonly eyeState?: EyeState;
  readonly leftBrow?: BrowState;
  readonly rightBrow?: BrowState;
  readonly mouthState?: MouthState;
  readonly comicEmote?: ComicEmoteType;
  readonly lookTarget?: readonly [number, number];
  readonly energy?: number;
  readonly lookYawOffset?: number;
}

export interface CharacterSpec {
  readonly id: string;
  readonly name: string;
  readonly voiceRole?: VoiceRole;
  readonly bodyColor: ColorHex;
  readonly trimColor: ColorHex;
  readonly scale: number;
  readonly seed: number;
  readonly footprintRadius?: number;
  readonly lockToGround?: boolean;
  readonly accessories: readonly AccessoryId[];
  readonly beats: readonly CharacterBeat[];
}

export interface CrowdBeat {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly fromOrigin: Vec3Tuple;
  readonly toOrigin: Vec3Tuple;
  readonly facingYaw: number;
}

export interface CrowdSpec {
  readonly id: string;
  readonly count: number;
  readonly origin: Vec3Tuple;
  readonly spread: readonly [number, number];
  readonly facingYaw: number;
  readonly bodyColor: ColorHex;
  readonly helmetColor: ColorHex;
  readonly headgear?: 'helmet' | 'turban' | 'mongol_hat';
  readonly weapon?: 'spear' | 'sword' | 'bow';
  readonly seed: number;
  readonly marchSpeed: number;
  readonly hasSpears: boolean;
  readonly beats?: readonly CrowdBeat[];
}
