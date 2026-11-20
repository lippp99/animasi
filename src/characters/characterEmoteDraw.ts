import { PAPER_CUTOUT_TOKENS } from '../core/tokens';
import type { ResolvedFaceState } from './characterFaceDraw';

/** Glossy Ricks-Clips diegetic comic symbols (sweat drop, pulsing anger vein, !/?, shock puff). */
export function drawComicEmote2D(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  face: ResolvedFaceState,
): void {
  if (face.comicEmote === 'none') return;
  const ink = PAPER_CUTOUT_TOKENS.inkColor;
  const t = face.emoteTime;
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (face.comicEmote === 'sweat_drop') {
    const drop = (t * 1.35) % 1;
    const dx = headX + 68;
    const dy = headY - 68 + drop * 28;
    const grad = ctx.createLinearGradient(dx - 12, dy - 22, dx + 12, dy + 22);
    grad.addColorStop(0, '#E8F9FF');
    grad.addColorStop(0.55, '#68D0FF');
    grad.addColorStop(1, '#2D9CDB');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(dx, dy - 26);
    ctx.bezierCurveTo(dx + 19, dy, dx + 17, dy + 22, dx, dy + 22);
    ctx.bezierCurveTo(dx - 17, dy + 22, dx - 19, dy, dx, dy - 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(dx - 5, dy + 3, 3.8, 7.5, -0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (face.comicEmote === 'anger_vein') {
    const pulse = 1 + Math.sin(t * 18) * 0.14;
    ctx.translate(headX + 64, headY - 62);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#E63946';
    ctx.lineWidth = 5.5;
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(Math.PI * 0.5);
      ctx.beginPath();
      ctx.moveTo(6, 18);
      ctx.quadraticCurveTo(6, 6, 18, 6);
      ctx.stroke();
    }
  } else if (face.comicEmote === 'exclaim' || face.comicEmote === 'question') {
    const bounce = Math.abs(Math.sin(t * 7.5)) * 12;
    ctx.translate(headX + 106, headY - 76 - bounce);
    ctx.font = '900 66px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 10;
    const glyph = face.comicEmote === 'exclaim' ? '!' : '?';
    ctx.strokeText(glyph, 0, 0);
    ctx.fillStyle = face.comicEmote === 'exclaim' ? '#FFCA3A' : '#FF595E';
    ctx.fillText(glyph, 0, 0);
  } else if (face.comicEmote === 'shock_puff') {
    const pop = 0.86 + Math.sin(t * 14) * 0.15;
    ctx.translate(headX - 102, headY - 64);
    ctx.scale(pop, pop);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.arc(-14, 10, 13, 0, Math.PI * 2);
    ctx.arc(14, 8, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
