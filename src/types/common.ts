export type Vec3Tuple = readonly [number, number, number];

export type ColorHex = number;

export type EasingName =
  | 'linear'
  | 'easeInOutCubic'
  | 'easeOutQuart'
  | 'easeOutBack'
  | 'easeInOutSine';

export interface SafeZoneInsets {
  readonly topPx: number;
  readonly bottomPx: number;
  readonly leftPx: number;
  readonly rightPx: number;
}

export type CameraImpulseKind = 'drop_thud' | 'impact_punch' | 'rumble_surge';

export type SfxAmbientKind =
  | 'night_wind'
  | 'ocean_waves'
  | 'campfire_crackle'
  | 'dawn_breeze';

export type SfxAccentKind =
  | 'heavy_thud'
  | 'war_drum'
  | 'wood_creak'
  | 'metal_clang'
  | 'whoosh'
  | 'arrow_volley';

export interface SfxAccentEvent {
  readonly id: string;
  readonly frame: number;
  readonly kind: SfxAccentKind;
  readonly gain: number;
  readonly cameraImpulse?: CameraImpulseKind;
  readonly impulseIntensity?: number;
  readonly timeDilationFrames?: number;
  readonly vfxPosition?: Vec3Tuple;
}

export interface SfxTrackSpec {
  readonly ambient: SfxAmbientKind;
  readonly ambientGain: number;
  readonly accents: readonly SfxAccentEvent[];
  readonly duckRatio?: number;
}

export interface AudioCue {
  readonly id: string;
  readonly startFrame: number;
  readonly durationFrames: number;
  readonly kind: 'voiceover' | 'sfx' | 'music';
  readonly label: string;
  readonly gain: number;
}

export interface RenderConfig {
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly crf: number;
  readonly pixelFormat: 'yuv420p';
}
