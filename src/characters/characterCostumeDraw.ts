import type { AccessoryId, CharacterSpec } from '../types/character';
import { PAPER_CUTOUT_TOKENS } from '../core/tokens';
import type { CharacterRig2DPose } from './characterRig2D';

export { drawHeldProps2D } from './characterPropsDraw';

function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function shadeCss(hex: number, mult: number): string {
  const r = Math.min(255, Math.max(0, Math.round(((hex >> 16) & 255) * mult)));
  const g = Math.min(255, Math.max(0, Math.round(((hex >> 8) & 255) * mult)));
  const b = Math.min(255, Math.max(0, Math.round((hex & 255) * mult)));
  return `rgb(${r},${g},${b})`;
}

/** Back accessories behind torso (billowing cape, scabbard). */
export function drawBackLayers2D(
  ctx: CanvasRenderingContext2D,
  spec: CharacterSpec,
  rig: CharacterRig2DPose,
): void {
  const has = (id: AccessoryId): boolean => spec.accessories.includes(id);
  const T = PAPER_CUTOUT_TOKENS;
  ctx.save();
  ctx.strokeStyle = T.inkColor;
  ctx.lineWidth = T.inkWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (has('cape')) {
    const sway = rig.clothSway * 30;
    ctx.fillStyle = shadeCss(spec.bodyColor, 0.72);
    ctx.beginPath();
    ctx.moveTo(rig.leftShoulder.x + 8, rig.leftShoulder.y - 12);
    ctx.quadraticCurveTo(rig.leftShoulder.x - 58 - sway * 0.5, rig.hip.y, rig.leftHip.x - 62 - sway, rig.hip.y + 84);
    ctx.lineTo(rig.rightHip.x + 14 - sway * 0.5, rig.hip.y + 70);
    ctx.lineTo(rig.rightShoulder.x - 6, rig.rightShoulder.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (has('scabbard')) {
    ctx.save();
    ctx.translate(rig.hip.x - 42, rig.hip.y - 18);
    ctx.rotate(0.55);
    ctx.fillStyle = '#5E3D26';
    ctx.beginPath();
    ctx.roundRect(-9, -68, 17, 126, 7);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Chubby Egg/Pear Torso with Ricks-Clips 2D linework, stitch marks, and glossy top-left highlight. */
export function drawChubbyTorsoCostume2D(
  ctx: CanvasRenderingContext2D,
  spec: CharacterSpec,
  rig: CharacterRig2DPose,
): void {
  const has = (id: AccessoryId): boolean => spec.accessories.includes(id);
  const T = PAPER_CUTOUT_TOKENS;
  const trimCss = hexToCss(spec.trimColor);
  const halfW = T.torsoWidth * 0.5;
  const halfH = T.torsoHeight * 0.5;

  ctx.save();
  ctx.translate(rig.torsoCenter.x, rig.torsoCenter.y);
  ctx.rotate(rig.torsoTiltRad);
  ctx.scale(rig.squashX, rig.squashY);

  const traceTorsoPath = (): void => {
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.68, -halfH * 0.88);
    ctx.quadraticCurveTo(0, -halfH * 1.04, halfW * 0.68, -halfH * 0.88);
    ctx.bezierCurveTo(halfW * 1.08, -halfH * 0.25, halfW * 1.12, halfH * 0.72, halfW * 0.62, halfH * 0.94);
    ctx.quadraticCurveTo(0, halfH * 1.06, -halfW * 0.62, halfH * 0.94);
    ctx.bezierCurveTo(-halfW * 1.12, halfH * 0.72, -halfW * 1.08, -halfH * 0.25, -halfW * 0.68, -halfH * 0.88);
    ctx.closePath();
  };

  const bodyGrad = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
  bodyGrad.addColorStop(0, shadeCss(spec.bodyColor, 1.16));
  bodyGrad.addColorStop(0.55, hexToCss(spec.bodyColor));
  bodyGrad.addColorStop(1, shadeCss(spec.bodyColor, 0.76));
  ctx.fillStyle = bodyGrad;
  traceTorsoPath();
  ctx.fill();

  ctx.save();
  ctx.clip();

  ctx.strokeStyle = T.inkColor;
  ctx.lineWidth = 3.6;
  ctx.fillStyle = '#F6EFE2';
  ctx.beginPath();
  ctx.moveTo(-24, -halfH * 0.86);
  ctx.lineTo(0, -halfH * 0.36);
  ctx.lineTo(24, -halfH * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = trimCss;
  ctx.fillRect(-7, -halfH * 0.36, 14, halfH * 1.42);
  ctx.strokeRect(-7, -halfH * 0.36, 14, halfH * 1.42);
  for (let by = -20; by <= 44; by += 26) {
    ctx.fillStyle = '#FAF6EB';
    ctx.beginPath();
    ctx.arc(0, by, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (has('chest_armor')) {
    const armorGrad = ctx.createLinearGradient(-halfW * 0.7, -50, halfW * 0.7, 30);
    armorGrad.addColorStop(0, '#B5C2D1');
    armorGrad.addColorStop(0.5, '#7F8C9D');
    armorGrad.addColorStop(1, '#586475');
    ctx.fillStyle = armorGrad;
    ctx.beginPath();
    ctx.roundRect(-halfW * 0.74, -52, halfW * 1.48, 76, 16);
    ctx.fill();
    ctx.lineWidth = 4.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.68, -14);
    ctx.lineTo(halfW * 0.68, -14);
    ctx.stroke();
  }

  if (has('sash_belt') || has('chest_armor')) {
    ctx.fillStyle = '#2B2320';
    ctx.fillRect(-halfW * 1.05, 36, halfW * 2.1, 24);
    ctx.strokeRect(-halfW * 1.05, 36, halfW * 2.1, 24);
    ctx.fillStyle = trimCss;
    ctx.fillRect(-16, 33, 32, 30);
    ctx.strokeRect(-16, 33, 32, 30);
  }

  ctx.strokeStyle = 'rgba(255, 250, 240, 0.75)';
  ctx.lineWidth = 2.8;
  for (let i = 0; i < 4; i += 1) {
    const sx = -halfW * 0.62 + i * 7;
    ctx.beginPath();
    ctx.moveTo(sx, 20);
    ctx.lineTo(sx - 5, 31);
    ctx.stroke();
  }

  ctx.strokeStyle = T.specularHighlight;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.66, -halfH * 0.62);
  ctx.quadraticCurveTo(-halfW * 0.9, -halfH * 0.08, -halfW * 0.72, halfH * 0.42);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = T.inkColor;
  ctx.lineWidth = T.inkWidth;
  traceTorsoPath();
  ctx.stroke();
  ctx.restore();
}

/** Layered 2D headgear with #231D1A outlines & glossy top-left white highlights. */
export function drawHeadgear2D(
  ctx: CanvasRenderingContext2D,
  spec: CharacterSpec,
  rig: CharacterRig2DPose,
): void {
  const has = (id: AccessoryId): boolean => spec.accessories.includes(id);
  const T = PAPER_CUTOUT_TOKENS;
  const trimCss = hexToCss(spec.trimColor);

  ctx.save();
  ctx.translate(rig.headCenter.x, rig.headCenter.y);
  ctx.rotate(rig.headTiltRad);
  ctx.strokeStyle = T.inkColor;
  ctx.lineWidth = T.inkWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (has('turban')) {
    const sway = rig.tailSway * 24;
    ctx.fillStyle = '#F3ECDC';
    ctx.beginPath();
    ctx.moveTo(-76, -24);
    ctx.quadraticCurveTo(-110 - sway * 0.5, 24, -100 - sway, 78);
    ctx.lineTo(-66 - sway * 0.7, 70);
    ctx.quadraticCurveTo(-74, 18, -52, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const tGrad = ctx.createLinearGradient(-90, -124, 90, -34);
    tGrad.addColorStop(0, '#FFFFFF');
    tGrad.addColorStop(0.65, '#F4ECDC');
    tGrad.addColorStop(1, '#DCD2BE');
    ctx.fillStyle = tGrad;
    ctx.beginPath();
    ctx.ellipse(0, -76, 108, 52, 0, Math.PI, Math.PI * 2);
    ctx.quadraticCurveTo(112, -38, 72, -32);
    ctx.quadraticCurveTo(0, -50, -76, -32);
    ctx.quadraticCurveTo(-114, -40, -108, -76);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-82, -58);
    ctx.quadraticCurveTo(0, -96, 80, -54);
    ctx.stroke();
    ctx.lineWidth = T.inkWidth;
    ctx.fillStyle = trimCss;
    ctx.beginPath();
    ctx.ellipse(12, -66, 17, 24, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (has('mongol_hat')) {
    const plumeSway = rig.tailSway * 18;
    ctx.fillStyle = '#D93030';
    ctx.beginPath();
    ctx.moveTo(0, -154);
    ctx.quadraticCurveTo(-40 - plumeSway, -146, -54 - plumeSway, -104);
    ctx.quadraticCurveTo(-20, -124, 10, -148);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const hGrad = ctx.createLinearGradient(-76, -148, 76, -48);
    hGrad.addColorStop(0, '#8A96A8');
    hGrad.addColorStop(0.55, '#596375');
    hGrad.addColorStop(1, '#3A4252');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.moveTo(-90, -54);
    ctx.quadraticCurveTo(-64, -132, 0, -154);
    ctx.quadraticCurveTo(64, -132, 90, -54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = T.specularHighlight;
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(-58, -76);
    ctx.quadraticCurveTo(-36, -118, -10, -136);
    ctx.stroke();

    ctx.strokeStyle = T.inkColor;
    ctx.lineWidth = T.inkWidth;
    ctx.fillStyle = '#4A3024';
    ctx.beginPath();
    ctx.roundRect(-98, -68, 196, 30, 15);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hexToCss(spec.bodyColor);
    ctx.beginPath();
    ctx.roundRect(-100, -46, 24, 52, 11);
    ctx.roundRect(76, -46, 24, 52, 11);
    ctx.fill();
    ctx.stroke();
  } else if (has('headband')) {
    const sway = rig.tailSway * 22;
    ctx.fillStyle = trimCss;
    ctx.fillRect(-92, -66, 184, 22);
    ctx.strokeRect(-92, -66, 184, 22);
    ctx.beginPath();
    ctx.moveTo(-90, -55);
    ctx.quadraticCurveTo(-124 - sway, -28, -116 - sway, 10);
    ctx.stroke();
  } else if (has('crown')) {
    ctx.fillStyle = '#F7C948';
    ctx.beginPath();
    ctx.moveTo(-66, -72);
    ctx.lineTo(-54, -124);
    ctx.lineTo(-20, -92);
    ctx.lineTo(0, -138);
    ctx.lineTo(20, -92);
    ctx.lineTo(54, -124);
    ctx.lineTo(66, -72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
