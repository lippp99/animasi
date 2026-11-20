import type {
  BrowState,
  CharacterBeat,
  ComicEmoteType,
  ExpressionPreset,
  EyeState,
  MouthState,
} from '../types/character';
import { clamp } from '../core/math';
import { MOTION_TOKENS, PAPER_CUTOUT_TOKENS } from '../core/tokens';
import { drawComicEmote2D } from './characterEmoteDraw';

export interface ResolvedFaceState {
  readonly eyeState: EyeState;
  readonly leftBrow: BrowState;
  readonly rightBrow: BrowState;
  readonly mouthState: MouthState;
  readonly comicEmote: ComicEmoteType;
  readonly lookX: number;
  readonly lookY: number;
  readonly audioAmplitude: number;
  readonly blinkClosed: boolean;
  readonly emoteTime: number;
}

const DEFAULT_FACE_MAP: Readonly<
  Record<ExpressionPreset, { eyeState: EyeState; leftBrow: BrowState; rightBrow: BrowState; mouthState: MouthState; comicEmote: ComicEmoteType }>
> = {
  shocked: { eyeState: 'wide_shock', leftBrow: 'worried_arch', rightBrow: 'worried_arch', mouthState: 'jaw_drop', comicEmote: 'sweat_drop' },
  angry: { eyeState: 'angry', leftBrow: 'furrowed', rightBrow: 'furrowed', mouthState: 'shout_open', comicEmote: 'anger_vein' },
  scheming: { eyeState: 'squint', leftBrow: 'skeptical_one_up', rightBrow: 'furrowed', mouthState: 'smirk', comicEmote: 'none' },
  worried: { eyeState: 'normal', leftBrow: 'worried_arch', rightBrow: 'worried_arch', mouthState: 'grit_teeth', comicEmote: 'sweat_drop' },
  happy: { eyeState: 'normal', leftBrow: 'neutral', rightBrow: 'neutral', mouthState: 'talk_neutral', comicEmote: 'none' },
  determined: { eyeState: 'angry', leftBrow: 'furrowed', rightBrow: 'furrowed', mouthState: 'talk_neutral', comicEmote: 'none' },
  neutral: { eyeState: 'normal', leftBrow: 'neutral', rightBrow: 'neutral', mouthState: 'talk_neutral', comicEmote: 'none' },
};

export function resolveFaceState(
  beat: CharacterBeat,
  simFrame: number,
  fps: number,
  seed: number,
  isSpeaking: boolean,
): ResolvedFaceState {
  const base = DEFAULT_FACE_MAP[beat.expression];
  const eyeState = beat.eyeState ?? base.eyeState;
  const timeSec = simFrame / fps;
  const blinkOffset = (Math.floor(simFrame) + seed * 31) % MOTION_TOKENS.blinkPeriodFrames;
  const blinkClosed =
    eyeState !== 'wide_shock' && eyeState !== 'x_dead' && eyeState !== 'closed_line' && blinkOffset < MOTION_TOKENS.blinkDurationFrames;
  const syllableWave = 0.52 + 0.32 * Math.sin(timeSec * 23 + seed) + 0.16 * Math.cos(timeSec * 38 + seed * 1.7);

  return {
    eyeState,
    leftBrow: beat.leftBrow ?? base.leftBrow,
    rightBrow: beat.rightBrow ?? base.rightBrow,
    mouthState: beat.mouthState ?? base.mouthState,
    comicEmote: beat.comicEmote ?? base.comicEmote,
    lookX: clamp(beat.lookTarget?.[0] ?? (beat.lookYawOffset ?? 0.18), -1, 1),
    lookY: clamp(beat.lookTarget?.[1] ?? 0, -1, 1),
    audioAmplitude: isSpeaking ? clamp(syllableWave, 0.2, 1.0) : 0,
    blinkClosed,
    emoteTime: timeSec,
  };
}

function drawCartoonEye(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  face: ResolvedFaceState,
  isRight: boolean,
): void {
  const ink = PAPER_CUTOUT_TOKENS.inkColor;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (face.blinkClosed || face.eyeState === 'closed_line') {
    ctx.beginPath();
    ctx.moveTo(-16, 2);
    ctx.lineTo(16, 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (face.eyeState === 'x_dead') {
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(-12, -12);
    ctx.lineTo(12, 12);
    ctx.moveTo(12, -12);
    ctx.lineTo(-12, 12);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const rx = face.eyeState === 'wide_shock' ? 24 : face.eyeState === 'squint' ? 17 : 19;
  const ry = face.eyeState === 'wide_shock' ? 27 : face.eyeState === 'squint' ? 10 : 22;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const jitter = face.eyeState === 'wide_shock' ? Math.sin(face.emoteTime * 46) * 1.4 : 0;
  const px = face.lookX * (rx * 0.3) + jitter;
  const py = face.lookY * (ry * 0.25);

  if (face.eyeState === 'symbol') {
    ctx.fillStyle = '#F5B041';
    ctx.beginPath();
    ctx.moveTo(px, py - 9);
    ctx.lineTo(px + 6, py);
    ctx.lineTo(px, py + 9);
    ctx.lineTo(px - 6, py);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    const pRad = face.eyeState === 'wide_shock' ? 4.8 : 6.4;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(px, py, pRad, 0, Math.PI * 2);
    ctx.fill();
  }

  if (face.eyeState === 'angry') {
    ctx.fillStyle = PAPER_CUTOUT_TOKENS.headIvory;
    const innerY = -3;
    const outerY = -18;
    ctx.beginPath();
    ctx.moveTo(-rx - 3, isRight ? innerY : outerY);
    ctx.lineTo(rx + 3, isRight ? outerY : innerY);
    ctx.lineTo(rx + 3, -ry - 6);
    ctx.lineTo(-rx - 3, -ry - 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-rx - 1, isRight ? innerY : outerY);
    ctx.lineTo(rx + 1, isRight ? outerY : innerY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, state: BrowState, isRight: boolean): void {
  const dir = isRight ? 1 : -1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = PAPER_CUTOUT_TOKENS.inkColor;
  ctx.lineWidth = 6.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (state === 'furrowed') {
    ctx.moveTo(-dir * 18, 6);
    ctx.lineTo(dir * 18, -9);
  } else if (state === 'worried_arch') {
    ctx.moveTo(-dir * 18, -10);
    ctx.quadraticCurveTo(0, -4, dir * 18, 7);
  } else if (state === 'skeptical_one_up') {
    ctx.moveTo(-dir * 16, -4);
    ctx.quadraticCurveTo(0, -17, dir * 18, -7);
  } else {
    ctx.moveTo(-16, -2);
    ctx.quadraticCurveTo(0, -6, 16, -2);
  }
  ctx.stroke();
  ctx.restore();
}

function drawCartoonMouth(ctx: CanvasRenderingContext2D, cx: number, cy: number, face: ResolvedFaceState): void {
  const amp = face.audioAmplitude;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = PAPER_CUTOUT_TOKENS.inkColor;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (face.mouthState === 'jaw_drop') {
    const ry = 20 + amp * 10;
    ctx.fillStyle = '#4A1922';
    ctx.beginPath();
    ctx.ellipse(0, 8, 17, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#E86A7A';
    ctx.beginPath();
    ctx.ellipse(0, 18 + amp * 4, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(0, 8, 17, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (face.mouthState === 'grit_teeth') {
    const h = 19 + amp * 6;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(-27, -6, 54, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-27, -6 + h * 0.5);
    ctx.lineTo(27, -6 + h * 0.5);
    for (let x = -16; x <= 16; x += 10.6) {
      ctx.moveTo(x, -6);
      ctx.lineTo(x, -6 + h);
    }
    ctx.stroke();
  } else if (face.mouthState === 'shout_open' || (face.mouthState !== 'smirk' && amp > 0.16)) {
    const w = face.mouthState === 'shout_open' ? 30 : 25;
    const h = (face.mouthState === 'shout_open' ? 24 : 14) + amp * 16;
    ctx.fillStyle = '#4A1922';
    ctx.beginPath();
    ctx.moveTo(-w, -4);
    ctx.quadraticCurveTo(0, -8, w, -4);
    ctx.quadraticCurveTo(w * 0.92, h, 0, h + 4);
    ctx.quadraticCurveTo(-w * 0.92, h, -w, -4);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-w, -9, w * 2, 12);
    ctx.fillStyle = '#E86A7A';
    ctx.beginPath();
    ctx.ellipse(0, h + 2, w * 0.65, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.stroke();
  } else if (face.mouthState === 'smirk') {
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.quadraticCurveTo(6, 11, 24, -6);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-17, 3);
    ctx.quadraticCurveTo(0, 8, 17, 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFaceAndEmotes2D(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  headTiltRad: number,
  face: ResolvedFaceState,
  hasGlasses: boolean,
): void {
  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(headTiltRad);
  const shift = face.lookX * 10;

  drawCartoonEye(ctx, -20 + shift, -4, face, false);
  drawCartoonEye(ctx, 20 + shift, -4, face, true);
  drawBrow(ctx, -24 + shift, -36, face.leftBrow, false);
  drawBrow(ctx, 24 + shift, -36, face.rightBrow, true);
  drawCartoonMouth(ctx, 2 + shift * 0.6, 40, face);

  if (hasGlasses) {
    ctx.strokeStyle = PAPER_CUTOUT_TOKENS.inkColor;
    ctx.lineWidth = 4.6;
    ctx.fillStyle = 'rgba(35, 29, 26, 0.88)';
    ctx.beginPath();
    ctx.roundRect(-48 + shift, -22, 42, 30, 6);
    ctx.roundRect(6 + shift, -22, 42, 30, 6);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-38 + shift, -16);
    ctx.lineTo(-26 + shift, 2);
    ctx.moveTo(16 + shift, -16);
    ctx.lineTo(28 + shift, 2);
    ctx.stroke();
  }
  ctx.restore();
  drawComicEmote2D(ctx, headX, headY, face);
}
