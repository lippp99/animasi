import type { CharacterSpec } from '../types/character';
import { PAPER_CUTOUT_TOKENS } from '../core/tokens';
import type { CharacterRig2DPose, Vec2 } from './characterRig2D';
import { drawFaceAndEmotes2D, type ResolvedFaceState } from './characterFaceDraw';
import {
  drawBackLayers2D,
  drawChubbyTorsoCostume2D,
  drawHeadgear2D,
  drawHeldProps2D,
} from './characterCostumeDraw';

/** Thin bendy dark #231D1A Ricks-Clips noodle limb (no noisy white pipe halo!). */
function drawThinWireLimb(ctx: CanvasRenderingContext2D, root: Vec2, joint: Vec2, end: Vec2): void {
  ctx.save();
  ctx.strokeStyle = PAPER_CUTOUT_TOKENS.inkColor;
  ctx.lineWidth = PAPER_CUTOUT_TOKENS.limbWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(root.x, root.y);
  ctx.quadraticCurveTo(joint.x, joint.y, end.x, end.y);
  ctx.stroke();
  ctx.restore();
}

/** Simple flat dark horizontal Ricks-Clips foot bar anchored cleanly on the floor line. */
function drawFlatFoot(ctx: CanvasRenderingContext2D, foot: Vec2, dirSign: 1 | -1): void {
  const T = PAPER_CUTOUT_TOKENS;
  ctx.save();
  ctx.strokeStyle = T.inkColor;
  ctx.lineWidth = T.limbWidth + 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(foot.x - dirSign * 4, foot.y - 4);
  ctx.lineTo(foot.x + dirSign * T.shoeWidth, foot.y - 4);
  ctx.stroke();
  ctx.restore();
}

/** Small round solid dark #231D1A Ricks-Clips hand ball at the tip of the thin wire arm. */
function drawTinyRoundHand(ctx: CanvasRenderingContext2D, hand: Vec2): void {
  ctx.save();
  ctx.fillStyle = PAPER_CUTOUT_TOKENS.inkColor;
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, PAPER_CUTOUT_TOKENS.handRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Big Ivory-White (#FAF7F2) Oval Head with #231D1A 7px outline & glossy top-left white highlight. */
function drawBigOvalHead(ctx: CanvasRenderingContext2D, rig: CharacterRig2DPose): void {
  const T = PAPER_CUTOUT_TOKENS;
  ctx.save();
  ctx.translate(rig.headCenter.x, rig.headCenter.y);
  ctx.rotate(rig.headTiltRad);
  ctx.scale(rig.squashX, rig.squashY);

  ctx.fillStyle = T.headIvory;
  ctx.beginPath();
  ctx.ellipse(0, 0, T.headRx, T.headRy, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.clip();
  // Soft warm-cool cartoon shade along bottom-right cheek
  ctx.fillStyle = T.headShadowTint;
  ctx.beginPath();
  ctx.ellipse(T.headRx * 0.42, T.headRy * 0.36, T.headRx * 0.78, T.headRy * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crisp Ricks-Clips glossy white highlight arc along top-left edge of head
  ctx.strokeStyle = T.specularHighlight;
  ctx.lineWidth = 7.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(0, 0, T.headRx - 11, T.headRy - 11, 0, Math.PI * 1.05, Math.PI * 1.48);
  ctx.stroke();
  ctx.restore();

  // Bold #231D1A ink border
  ctx.strokeStyle = T.inkColor;
  ctx.lineWidth = T.inkWidth;
  ctx.beginPath();
  ctx.ellipse(0, 0, T.headRx, T.headRy, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Pure 2D Vector Canvas Cutout renderer (512 x 768) in authentic Ricks-Clips style:
 * - Thick #231D1A outlines (7px) & top-left white specular highlights
 * - Plump egg-capsule torso with layered 2D historical costume details
 * - Big #FAF7F2 oval head overlapping torso shoulders directly (ZERO neck)
 * - Thin bendy #231D1A wire arms & legs with tiny round hands & flat floor-locked feet
 */
export function drawVectorCutoutCharacter(
  ctx: CanvasRenderingContext2D,
  spec: CharacterSpec,
  rig: CharacterRig2DPose,
  face: ResolvedFaceState,
  timeSec: number,
): void {
  const T = PAPER_CUTOUT_TOKENS;
  ctx.clearRect(0, 0, T.canvasWidth, T.canvasHeight);

  // 1. Back layers (cape, scabbard)
  drawBackLayers2D(ctx, spec, rig);

  // 2. Thin bendy wire legs + flat floor-locked feet
  drawThinWireLimb(ctx, rig.leftHip, rig.leftKnee, rig.leftFoot);
  drawFlatFoot(ctx, rig.leftFoot, -1);
  drawThinWireLimb(ctx, rig.rightHip, rig.rightKnee, rig.rightFoot);
  drawFlatFoot(ctx, rig.rightFoot, 1);

  // 3. Far thin wire arm + small dark round hand
  drawThinWireLimb(ctx, rig.leftShoulder, rig.leftElbow, rig.leftHand);
  drawTinyRoundHand(ctx, rig.leftHand);

  // 4. Plump chubby egg-capsule torso + costume details + white top-left highlight
  drawChubbyTorsoCostume2D(ctx, spec, rig);

  // 5. Big #FAF7F2 oval head overlapping torso directly (NO neck!) + cartoon face + headgear
  drawBigOvalHead(ctx, rig);
  drawFaceAndEmotes2D(
    ctx,
    rig.headCenter.x,
    rig.headCenter.y,
    rig.headTiltRad,
    face,
    spec.accessories.includes('glasses'),
  );
  drawHeadgear2D(ctx, spec, rig);

  // 6. Near thin wire arm + held 2D weapons + tiny dark round hand
  drawThinWireLimb(ctx, rig.rightShoulder, rig.rightElbow, rig.rightHand);
  drawHeldProps2D(ctx, spec, rig, timeSec);
  drawTinyRoundHand(ctx, rig.rightHand);
}
