import type { CharacterActionType } from '../types/character';
import { applyEasing, clamp, lerp } from '../core/math';
import { MOTION_TOKENS, PAPER_CUTOUT_TOKENS, TOON_WORLD_TOKENS } from '../core/tokens';
import {
  evaluateDampedSpring2D,
  solveTwoBoneIK2D,
  type CharacterBeatSample,
  type PropSocket2D,
  type Vec2,
} from './characterIKMath';

export {
  evaluateDampedSpring2D,
  evaluateFlipSpring,
  sampleCharacterBeat,
  solveTwoBoneIK2D,
  type CharacterBeatSample,
  type PropSocket2D,
  type TwoBoneIK2DResult,
  type Vec2,
} from './characterIKMath';

export interface CharacterRig2DPose {
  readonly hip: Vec2;
  readonly leftHip: Vec2;
  readonly rightHip: Vec2;
  readonly leftKnee: Vec2;
  readonly leftFoot: Vec2;
  readonly rightKnee: Vec2;
  readonly rightFoot: Vec2;
  readonly torsoCenter: Vec2;
  readonly torsoTiltRad: number;
  readonly headCenter: Vec2;
  readonly headTiltRad: number;
  readonly squashX: number;
  readonly squashY: number;
  readonly leftShoulder: Vec2;
  readonly leftElbow: Vec2;
  readonly leftHand: Vec2;
  readonly rightShoulder: Vec2;
  readonly rightElbow: Vec2;
  readonly rightHand: Vec2;
  readonly gripSocketA: PropSocket2D;
  readonly gripSocketB: PropSocket2D;
  readonly clothSway: number;
  readonly tailSway: number;
  readonly slashArcAlpha: number;
  readonly footDustIntensity: number;
}

function solveFootTarget(
  action: CharacterActionType,
  cyclePos: number,
  sideSign: 1 | -1,
  hipX: number,
  stridePx: number,
  liftPx: number,
): Vec2 {
  const baseY = PAPER_CUTOUT_TOKENS.footBaseY;
  if (action === 'kneel_inspect') {
    return { x: hipX + sideSign * (sideSign > 0 ? 52 : 38), y: baseY };
  }
  if (stridePx < 1) {
    const stance = action === 'combat_slash_or_block' || action === 'draw_bow' ? 54 : 42;
    return { x: hipX + sideSign * stance, y: baseY };
  }
  const phase = ((cyclePos + (sideSign > 0 ? 0 : 0.5)) % 1 + 1) % 1;
  if (phase < 0.56) {
    return { x: hipX + lerp(stridePx, -stridePx, phase / 0.56), y: baseY };
  }
  const swingT = (phase - 0.56) / 0.44;
  return {
    x: hipX + lerp(-stridePx, stridePx, swingT),
    y: baseY - Math.sin(swingT * Math.PI) * liftPx,
  };
}

export function evaluateRig2D(
  sample: CharacterBeatSample,
  timeSec: number,
  seed: number,
  isSpeaking: boolean,
): CharacterRig2DPose {
  const T = PAPER_CUTOUT_TOKENS;
  const action = sample.beat.action;
  const e = sample.energy;
  const phase = (seed % 97) * 0.31;

  const isLocomoting =
    action === 'walk' || action === 'run_sprint' || action === 'sneak' || action === 'riding_bob';
  const movedMeters = sample.travelDist * sample.travelProgress;
  const cyclePos =
    isLocomoting && sample.travelDist > 0.2
      ? movedMeters / TOON_WORLD_TOKENS.footStrideLength
      : isLocomoting
        ? timeSec * (action === 'run_sprint' ? MOTION_TOKENS.runStepFreqHz : MOTION_TOKENS.walkStepFreqHz) * 0.5
        : 0;

  const stridePx =
    action === 'run_sprint' ? 62 : action === 'walk' ? 46 : action === 'sneak' ? 36 : action === 'riding_bob' ? 40 : 0;
  const liftPx =
    action === 'run_sprint' ? 42 : action === 'walk' ? 28 : action === 'sneak' ? 20 : action === 'riding_bob' ? 32 : 0;

  const breath = Math.sin(timeSec * Math.PI * 2 * MOTION_TOKENS.breathFreqHz + phase);
  const stepBounce = isLocomoting ? Math.abs(Math.sin(cyclePos * Math.PI * 2)) : 0;
  const talkBounce = isSpeaking ? Math.sin(timeSec * Math.PI * 2 * MOTION_TOKENS.talkBounceFreqHz) * 5.5 : 0;

  let hipOffsetY = breath * 3.5 - stepBounce * (action === 'run_sprint' ? 14 : 8);
  let torsoTiltRad = 0;
  let squashY = 1 + breath * MOTION_TOKENS.breathSquashAmp;

  if (action === 'run_sprint') {
    torsoTiltRad = 0.18 * e;
    squashY = 1 + (stepBounce - 0.5) * 0.07;
  } else if (action === 'sneak') {
    hipOffsetY += 24;
    torsoTiltRad = 0.22;
  } else if (action === 'kneel_inspect') {
    hipOffsetY += 36;
    torsoTiltRad = 0.12;
  } else if (action === 'stagger_knockback') {
    torsoTiltRad = -0.2 * e + Math.sin(timeSec * 8 + phase) * 0.09;
    hipOffsetY += 10;
    squashY = 0.93;
  } else if (action === 'combat_slash_or_block') {
    const slashWave = Math.sin(timeSec * 7.0 + phase);
    torsoTiltRad = 0.1 + slashWave * 0.12;
    hipOffsetY += 6;
    squashY = 1 + slashWave * 0.05;
  } else if (action === 'riding_bob') {
    hipOffsetY += Math.sin(timeSec * 12 + phase) * 9 - 5;
    torsoTiltRad = 0.12;
  }

  const hipX = T.centerX + Math.sin(torsoTiltRad) * 10;
  const hipY = T.hipY + hipOffsetY;
  const leftHip: Vec2 = { x: hipX - T.hipHalfW, y: hipY - 4 };
  const rightHip: Vec2 = { x: hipX + T.hipHalfW, y: hipY - 4 };

  const leftLeg = solveTwoBoneIK2D(leftHip, solveFootTarget(action, cyclePos, -1, hipX, stridePx, liftPx), T.thighLen, T.shinLen, -1);
  const rightLeg = solveTwoBoneIK2D(rightHip, solveFootTarget(action, cyclePos, 1, hipX, stridePx, liftPx), T.thighLen, T.shinLen, 1);

  const torsoCenter: Vec2 = {
    x: hipX + Math.sin(torsoTiltRad) * (T.torsoHeight * 0.45),
    y: hipY - Math.cos(torsoTiltRad) * (T.torsoHeight * 0.45) * squashY,
  };
  const headCenter: Vec2 = {
    x: torsoCenter.x + Math.sin(torsoTiltRad) * 145,
    y: torsoCenter.y - 166 + talkBounce * 0.65,
  };
  const headTiltRad = torsoTiltRad * 0.55 + Math.sin(timeSec * 2.2 + phase) * 0.035;

  const shoulderY = torsoCenter.y - 36;
  const leftShoulder: Vec2 = { x: torsoCenter.x - T.shoulderHalfW, y: shoulderY };
  const rightShoulder: Vec2 = { x: torsoCenter.x + T.shoulderHalfW, y: shoulderY };

  let lTarget: Vec2 = { x: leftShoulder.x - 42, y: leftShoulder.y + 84 };
  let rTarget: Vec2 = { x: rightShoulder.x + 54, y: rightShoulder.y + 74 };
  let slashArcAlpha = 0;

  if (action === 'walk' || action === 'run_sprint' || action === 'riding_bob') {
    const swing = Math.sin(cyclePos * Math.PI * 2);
    const amp = action === 'run_sprint' ? 62 : 42;
    lTarget = { x: leftShoulder.x - 24 - swing * amp, y: leftShoulder.y + 72 - Math.abs(swing) * 16 };
    rTarget = { x: rightShoulder.x + 28 + swing * amp, y: rightShoulder.y + 68 - Math.abs(swing) * 16 };
  } else if (action === 'point_command') {
    lTarget = { x: leftShoulder.x - 42, y: leftShoulder.y + 72 };
    rTarget = { x: rightShoulder.x + 104, y: rightShoulder.y - 24 + Math.sin(timeSec * 5) * 9 };
  } else if (action === 'combat_slash_or_block') {
    const sp = ((timeSec * 1.45 + phase) % 1 + 1) % 1;
    const ang = lerp(-1.3, 0.95, applyEasing('easeOutQuart', sp));
    rTarget = { x: rightShoulder.x + Math.cos(ang) * 114, y: rightShoulder.y + Math.sin(ang) * 108 };
    lTarget = { x: leftShoulder.x - 36, y: leftShoulder.y + 38 };
    slashArcAlpha = sp > 0.14 && sp < 0.65 ? Math.sin(((sp - 0.14) / 0.51) * Math.PI) : 0;
  } else if (action === 'draw_bow') {
    const draw = 0.5 + 0.5 * Math.sin(timeSec * 3.8 + phase);
    rTarget = { x: rightShoulder.x + 98, y: rightShoulder.y - 10 };
    lTarget = { x: leftShoulder.x + 18 - draw * 24, y: leftShoulder.y - 6 };
  } else if (action === 'explain_gesture') {
    const g = Math.sin(timeSec * 5.2 + phase);
    lTarget = { x: leftShoulder.x - 46, y: leftShoulder.y + 38 + g * 18 };
    rTarget = { x: rightShoulder.x + 74, y: rightShoulder.y + 20 - g * 22 };
  } else if (action === 'stagger_knockback') {
    lTarget = { x: headCenter.x - 104, y: headCenter.y + 12 };
    rTarget = { x: headCenter.x + 104, y: headCenter.y + 8 };
  } else if (action === 'kneel_inspect') {
    lTarget = { x: leftShoulder.x - 28, y: leftShoulder.y + 74 };
    rTarget = { x: rightShoulder.x + 64, y: rightShoulder.y + 54 };
  }

  const clampVec = (v: Vec2): Vec2 => ({ x: clamp(v.x, 42, T.canvasWidth - 42), y: clamp(v.y, 140, T.footBaseY - 40) });
  const leftArm = solveTwoBoneIK2D(leftShoulder, clampVec(lTarget), T.upperArmLen, T.forearmLen, -1);
  const rightArm = solveTwoBoneIK2D(rightShoulder, clampVec(rTarget), T.upperArmLen, T.forearmLen, 1);

  const velImp = isLocomoting ? (action === 'run_sprint' ? 1.1 : 0.6) : 0.22;
  const clampedSq = clamp(squashY, 1 - MOTION_TOKENS.maxSquashDelta, 1 + MOTION_TOKENS.maxSquashDelta);

  return {
    hip: { x: hipX, y: hipY },
    leftHip,
    rightHip,
    leftKnee: leftLeg.joint,
    leftFoot: leftLeg.end,
    rightKnee: rightLeg.joint,
    rightFoot: rightLeg.end,
    torsoCenter,
    torsoTiltRad,
    headCenter,
    headTiltRad,
    squashX: 1 / Math.sqrt(clampedSq),
    squashY: clampedSq,
    leftShoulder,
    leftElbow: leftArm.joint,
    leftHand: leftArm.end,
    rightShoulder,
    rightElbow: rightArm.joint,
    rightHand: rightArm.end,
    gripSocketA: { x: rightArm.end.x, y: rightArm.end.y, angleRad: Math.atan2(rightArm.end.y - rightArm.joint.y, rightArm.end.x - rightArm.joint.x) },
    gripSocketB: { x: leftArm.end.x, y: leftArm.end.y, angleRad: Math.atan2(leftArm.end.y - leftArm.joint.y, leftArm.end.x - leftArm.joint.x) },
    clothSway: evaluateDampedSpring2D(timeSec, phase, velImp),
    tailSway: evaluateDampedSpring2D(timeSec, phase + 0.85, velImp * 1.15, 22),
    slashArcAlpha,
    footDustIntensity: action === 'run_sprint' ? 1.0 : action === 'riding_bob' ? 0.85 : action === 'walk' ? 0.4 : 0,
  };
}
