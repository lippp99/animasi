import type { ColorHex, EasingName, Vec3Tuple } from './common';

export type TimeOfDayPreset =
  | 'dawn'
  | 'harsh_noon'
  | 'war_dusk'
  | 'storm_overcast'
  | 'starry_night';

export type WeatherType = 'none' | 'dust_wind' | 'rain' | 'embers' | 'fog_wisps';

export type PropKind =
  | 'fortress_wall'
  | 'stone_tower'
  | 'obelisk'
  | 'banner_pole'
  | 'brazier'
  | 'tent'
  | 'war_cart'
  | 'ship_hull'
  | 'timber_log'
  | 'boulder'
  | 'pine_tree';

export interface GlbPropSpec {
  readonly url: string;
  readonly position: Vec3Tuple;
  readonly rotationY: number;
  readonly scale: number;
  readonly tintColor?: ColorHex;
  readonly outlineThickness?: number;
  readonly lockToGround?: boolean;
}

export interface CutawaySpec {
  readonly enabled: boolean;
  readonly normal: Vec3Tuple;
  readonly startConstant: number;
  readonly endConstant: number;
  readonly easing?: EasingName;
  readonly rimColor?: ColorHex;
  readonly sliceCenter?: Vec3Tuple;
}

export interface WorldMoodTokens {
  readonly skyTop: ColorHex;
  readonly skyHorizon: ColorHex;
  readonly skyBottom: ColorHex;
  readonly sunColor: ColorHex;
  readonly sunPosition: Vec3Tuple;
  readonly sunIntensity: number;
  readonly hemiSky: ColorHex;
  readonly hemiGround: ColorHex;
  readonly hemiIntensity: number;
  readonly rimColor: ColorHex;
  readonly rimIntensity: number;
  readonly coolShadowColor: ColorHex;
  readonly fogColor: ColorHex;
  readonly fogDensity: number;
  readonly starVisibility: number;
  readonly moonVisibility: number;
  readonly cloudVisibility: number;
  readonly cloudColor: ColorHex;
  readonly lightShaftIntensity: number;
  readonly bloomStrength: number;
  readonly bloomThreshold: number;
  readonly gradeWarmth: number;
  readonly gradeContrast: number;
  readonly gradeSaturation: number;
  readonly exposure: number;
}

export interface PropPlacement {
  readonly kind: PropKind;
  readonly position: Vec3Tuple;
  readonly rotationY: number;
  readonly scale: number;
  readonly accentColor?: ColorHex;
  readonly footprintRadius?: number;
  readonly lockToGround?: boolean;
}

export type ProceduralMaterialKind =
  | 'sand_dunes'
  | 'earth_grass'
  | 'ancient_stone'
  | 'weathered_wood'
  | 'forged_metal'
  | 'woven_fabric';

export interface TerrainConfig {
  readonly groundColor: ColorHex;
  readonly groundAccent: ColorHex;
  readonly waterColor: ColorHex;
  readonly waterLevel: number;
  readonly showWater: boolean;
  readonly seed: number;
  readonly materialKind?: 'earth_grass' | 'sand_dunes';
}

export interface WorldSpec {
  readonly defaultMood: TimeOfDayPreset;
  readonly defaultWeather: WeatherType;
  readonly terrain: TerrainConfig;
  readonly props: readonly PropPlacement[];
  readonly glbProps?: readonly GlbPropSpec[];
}
