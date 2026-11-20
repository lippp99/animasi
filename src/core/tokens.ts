import type { RenderConfig, SafeZoneInsets } from '../types/common';

export const RENDER_CONFIG: RenderConfig = {
  width: 1080,
  height: 1920,
  fps: 60,
  crf: 18,
  pixelFormat: 'yuv420p',
};

export const HARDWARE_RENDER_TOKENS = {
  qsvPreset: 'fast',
  qsvGlobalQuality: 20,
  qsvPixelFormat: 'nv12',
  maxWorkersHighRam: 4,
  maxWorkersLowRam: 2,
  highRamThresholdGb: 32,
  highRamBufferFrames: 256,
  lowRamBufferFrames: 32,
} as const;

/** Vertical 9:16 Safe Zone for YouTube Shorts / Reels / TikTok. */
export const SAFE_ZONE: SafeZoneInsets = {
  topPx: 156,
  bottomPx: 360,
  leftPx: 64,
  rightPx: 168,
};

/** Pure 2D Vector Canvas Cutout proportions & Ricks-Clips ink tokens (512 x 768 canvas). */
export const PAPER_CUTOUT_TOKENS = {
  canvasWidth: 512,
  canvasHeight: 768,
  crowdCanvasWidth: 256,
  crowdCanvasHeight: 384,
  planeWidth: 1.72,
  planeHeight: 2.58,
  crowdPlaneWidth: 1.48,
  crowdPlaneHeight: 2.22,
  alphaTest: 0.1,
  inkColor: '#231D1A',
  inkWidth: 7,
  limbWidth: 9.5,
  paperRimColor: 'rgba(255, 252, 245, 0.85)',
  paperRimWidth: 2.5,
  headIvory: '#FAF7F2',
  headShadowTint: 'rgba(62, 56, 78, 0.14)',
  specularHighlight: 'rgba(255, 255, 255, 0.78)',
  centerX: 256,
  footBaseY: 734,
  hipY: 564,
  torsoTopY: 366,
  torsoWidth: 168,
  torsoHeight: 204,
  shoulderY: 406,
  shoulderHalfW: 66,
  hipHalfW: 44,
  headCenterY: 288,
  headRx: 98,
  headRy: 108,
  thighLen: 92,
  shinLen: 92,
  upperArmLen: 84,
  forearmLen: 78,
  handRadius: 11,
  shoeWidth: 32,
  flipSpringRate: 12,
  minFlipScaleX: 0.08,
} as const;

export const TOON_WORLD_TOKENS = {
  toonSteps: 3,
  inkOutlineColor: 0x231d1a,
  propOutlineThickness: 0.03,
  edgeThresholdDeg: 22,
  coolShadowColor: 0x3b4275,
  coolShadowStrength: 0.34,
  cutawayRimColor: 0xffd166,
  cutawayRimWidth: 0.28,
  cutawayCapColor: 0x4b3b36,
  rimHighlightColor: 0xffe4b3,
  filmGrainStrength: 0.022,
  timeDilationScale: 0.25,
  defaultTimeDilationFrames: 8,
  footStrideLength: 0.92,
  footLiftHeight: 36,
  ikReachLimitRatio: 0.992,
  springDamping: 6.4,
  springStiffness: 18.0,
} as const;

export const SPATIAL_TOKENS = {
  defaultCharacterRadius: 0.56,
  crowdMemberRadius: 0.48,
  minClearancePadding: 0.18,
  solverIterations: 4,
  elevationToleranceY: 1.6,
} as const;

export const MOTION_TOKENS = {
  breathFreqHz: 0.48,
  breathSquashAmp: 0.03,
  walkStepFreqHz: 2.35,
  marchStepFreqHz: 1.85,
  runStepFreqHz: 3.65,
  talkBounceFreqHz: 4.6,
  blinkPeriodFrames: 184,
  blinkDurationFrames: 7,
  followThroughLagFrames: 6,
  maxSquashDelta: 0.18,
} as const;

export const CAMERA_IMPULSE_TOKENS = {
  springFrequencyHz: 3.4,
  springDamping: 7.5,
  dropOffsetY: -0.14,
  dropPitchRad: -0.022,
  punchFovDeg: 3.6,
  punchShakeScale: 0.09,
  rumbleRollRad: 0.024,
  attackSec: 0.05,
  maxWindowSec: 1.2,
} as const;

export const WORLD_TOKENS = {
  terrainSize: 140,
  terrainSegments: 96,
  skyRadius: 110,
  shadowMapSize: 2048,
  shadowBounds: 28,
  waterSize: 140,
  particleCount: 420,
  particleVolumeRadius: 24,
  particleVolumeHeight: 18,
  cameraNear: 0.1,
  cameraFar: 220,
  rimLightDistance: 10,
  rimLightHeight: 5.5,
  verticalSafeTargetBiasY: -0.22,
} as const;

export const OVERLAY_TOKENS = {
  fontFamilyDisplay: '"Segoe UI", "Trebuchet MS", system-ui, sans-serif',
  fontFamilyMono: '"Consolas", "Courier New", monospace',
  accentAmber: '#ffca52',
  accentCrimson: '#ff5247',
  textPrimary: '#fdfaf3',
  textMuted: '#e2d7c5',
  panelBg: 'rgba(14, 13, 18, 0.72)',
  panelBorder: 'rgba(245, 176, 65, 0.48)',
  badgeDefaultDurationFrames: 210,
  badgeFadeFrames: 18,
} as const;

export const SFX_TOKENS = {
  defaultAmbientGain: 0.16,
  defaultAccentGain: 0.55,
  defaultDuckThreshold: 0.04,
  defaultDuckRatio: 5.5,
} as const;

export const QA_REVIEW_TOKENS = {
  tileWidth: 270,
  tileHeight: 480,
  denseCols: 4,
  denseRows: 3,
  allCols: 6,
  allRows: 5,
  denseStepFrames: 24,
  labelFontSize: 18,
} as const;
