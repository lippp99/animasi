import type { AccessoryId, CharacterSpec } from '../types/character';
import { PAPER_CUTOUT_TOKENS } from '../core/tokens';
import type { CharacterRig2DPose } from './characterRig2D';

function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

/** 2D Inked historical weapons & props locked to gripSocketA & gripSocketB. */
export function drawHeldProps2D(
  ctx: CanvasRenderingContext2D,
  spec: CharacterSpec,
  rig: CharacterRig2DPose,
  timeSec: number,
): void {
  const has = (id: AccessoryId): boolean => spec.accessories.includes(id);
  const T = PAPER_CUTOUT_TOKENS;
  const trimCss = hexToCss(spec.trimColor);
  const sockA = rig.gripSocketA;
  const sockB = rig.gripSocketB;

  ctx.save();
  ctx.strokeStyle = T.inkColor;
  ctx.lineWidth = T.inkWidth - 1;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (has('sword')) {
    ctx.save();
    ctx.translate(sockA.x, sockA.y);
    ctx.rotate(sockA.angleRad - 0.85);
    if (rig.slashArcAlpha > 0.05) {
      ctx.save();
      ctx.globalAlpha = rig.slashArcAlpha * 0.72;
      ctx.fillStyle = '#FFF1B8';
      ctx.beginPath();
      ctx.arc(0, 0, 122, -1.9, -0.45);
      ctx.arc(0, 0, 74, -0.45, -1.9, true);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#E6EEF5';
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.quadraticCurveTo(22, -74, 8, -132);
    ctx.quadraticCurveTo(-8, -82, -14, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = trimCss;
    ctx.fillRect(-18, -14, 36, 10);
    ctx.strokeRect(-18, -14, 36, 10);
    ctx.restore();
  } else if (has('bow')) {
    ctx.save();
    ctx.translate(sockA.x, sockA.y);
    ctx.rotate(sockA.angleRad * 0.35);
    ctx.strokeStyle = '#6B4226';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-16, -70);
    ctx.quadraticCurveTo(36, 0, -16, 70);
    ctx.stroke();
    ctx.strokeStyle = T.inkColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-16, -70);
    ctx.lineTo(-30, 0);
    ctx.lineTo(-16, 70);
    ctx.stroke();
    ctx.strokeStyle = '#E8C589';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(48, 0);
    ctx.stroke();
    ctx.restore();
  } else if (has('spear') || has('banner')) {
    ctx.save();
    ctx.translate(sockA.x, sockA.y);
    ctx.rotate(sockA.angleRad * 0.25 - 0.12);
    ctx.fillStyle = '#6B4423';
    ctx.fillRect(-4, -155, 9, 215);
    ctx.strokeRect(-4, -155, 9, 215);
    if (has('banner')) {
      ctx.fillStyle = hexToCss(spec.bodyColor);
      ctx.beginPath();
      ctx.moveTo(5, -148);
      ctx.lineTo(68, -136 + rig.clothSway * 10);
      ctx.lineTo(54, -100 + rig.clothSway * 8);
      ctx.lineTo(5, -92);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#E2EAF2';
      ctx.beginPath();
      ctx.moveTo(-11, -155);
      ctx.lineTo(0, -196);
      ctx.lineTo(11, -155);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  if (has('shield')) {
    ctx.save();
    ctx.translate(sockB.x, sockB.y);
    ctx.fillStyle = hexToCss(spec.bodyColor);
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = trimCss;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (has('map_scroll')) {
    ctx.save();
    ctx.translate(sockB.x, sockB.y);
    ctx.rotate(-0.35);
    ctx.fillStyle = '#F5E2B8';
    ctx.beginPath();
    ctx.roundRect(-22, -13, 44, 28, 7);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (has('torch')) {
    ctx.save();
    ctx.translate(sockB.x, sockB.y);
    ctx.fillStyle = '#5E3B1E';
    ctx.fillRect(-4, -44, 9, 56);
    ctx.strokeRect(-4, -44, 9, 56);
    const fl = 1 + Math.sin(timeSec * 18) * 0.16;
    ctx.fillStyle = '#FF9F1C';
    ctx.beginPath();
    ctx.ellipse(0, -58, 14 * fl, 22 * fl, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
