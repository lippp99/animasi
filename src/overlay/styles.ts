import { OVERLAY_TOKENS, RENDER_CONFIG, SAFE_ZONE } from '../core/tokens';

let stylesInjected = false;

export function injectOverlayStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #07070a;
      overflow: hidden;
      font-family: ${OVERLAY_TOKENS.fontFamilyDisplay};
      color: ${OVERLAY_TOKENS.textPrimary};
    }
    #app {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stage-shell {
      position: relative;
      width: ${RENDER_CONFIG.width}px;
      height: ${RENDER_CONFIG.height}px;
      overflow: hidden;
      background: #000;
      transform-origin: center center;
    }
    .stage-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
    .hud-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      padding: ${SAFE_ZONE.topPx}px ${SAFE_ZONE.rightPx}px ${SAFE_ZONE.bottomPx}px ${SAFE_ZONE.leftPx}px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .hud-top {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 18px;
    }
    /* Minimalist ephemeral chapter stamp — zero heavy box covering 3D visuals */
    .era-badge {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      padding: 4px 0 4px 16px;
      background: transparent;
      border: none;
      border-left: 5px solid ${OVERLAY_TOKENS.accentAmber};
      will-change: transform, opacity;
    }
    .era-year {
      font-family: ${OVERLAY_TOKENS.fontFamilyMono};
      font-size: 30px;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: ${OVERLAY_TOKENS.accentAmber};
      -webkit-text-stroke: 2px rgba(7, 6, 11, 0.92);
      paint-order: stroke fill;
      text-shadow: 0 3px 10px rgba(0, 0, 0, 0.88);
    }
    .era-divider {
      width: 2px;
      height: 24px;
      background: rgba(255, 202, 82, 0.72);
    }
    .era-location {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${OVERLAY_TOKENS.textPrimary};
      -webkit-text-stroke: 2px rgba(7, 6, 11, 0.92);
      paint-order: stroke fill;
      text-shadow: 0 3px 10px rgba(0, 0, 0, 0.88);
    }
    .callout-card {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      padding: 12px 20px;
      background: linear-gradient(90deg, rgba(16, 14, 20, 0.68), rgba(16, 14, 20, 0.16));
      border-left: 5px solid ${OVERLAY_TOKENS.accentAmber};
      border-radius: 6px;
      will-change: transform, opacity;
    }
    .callout-metric {
      font-size: 36px;
      font-weight: 900;
      color: ${OVERLAY_TOKENS.accentAmber};
      line-height: 1.05;
      -webkit-text-stroke: 2px rgba(7, 6, 11, 0.85);
      paint-order: stroke fill;
    }
    .callout-label {
      font-size: 21px;
      font-weight: 700;
      color: ${OVERLAY_TOKENS.textPrimary};
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
    }
    .hud-bottom {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
    /* Clean cardless subtitle: zero box, zero border, high-contrast dark stroke + soft shadow */
    .subtitle-box {
      max-width: 100%;
      padding: 6px 12px;
      background: transparent;
      border: none;
      box-shadow: none;
      text-align: center;
      will-change: transform, opacity;
    }
    .subtitle-speaker {
      font-family: ${OVERLAY_TOKENS.fontFamilyMono};
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: ${OVERLAY_TOKENS.accentAmber};
      margin-bottom: 6px;
      -webkit-text-stroke: 2.5px rgba(8, 7, 12, 0.96);
      paint-order: stroke fill;
      text-shadow: 0 3px 10px rgba(0, 0, 0, 0.95);
    }
    .subtitle-text {
      font-size: 50px;
      font-weight: 900;
      line-height: 1.2;
      color: ${OVERLAY_TOKENS.textPrimary};
      -webkit-text-stroke: 4.5px rgba(8, 7, 12, 0.96);
      paint-order: stroke fill;
      text-shadow:
        0 4px 12px rgba(0, 0, 0, 0.92),
        0 0 26px rgba(0, 0, 0, 0.65);
    }
    .subtitle-highlight {
      color: ${OVERLAY_TOKENS.accentAmber};
      text-shadow:
        0 4px 12px rgba(0, 0, 0, 0.96),
        0 0 22px rgba(255, 168, 52, 0.55);
    }
    .transition-veil {
      position: absolute;
      inset: 0;
      background: #060609;
      pointer-events: none;
    }
    .transition-occlusion {
      position: absolute;
      top: -6%;
      width: 68%;
      height: 112%;
      background: linear-gradient(90deg, rgba(8, 7, 12, 0) 0%, #09080e 24%, #09080e 76%, rgba(8, 7, 12, 0) 100%);
      pointer-events: none;
      opacity: 0;
      will-change: transform, opacity;
    }
    .transition-flare {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 62% 38%, rgba(255, 240, 200, 0.96) 0%, rgba(255, 178, 86, 0.72) 34%, rgba(255, 120, 48, 0) 75%);
      mix-blend-mode: screen;
      pointer-events: none;
      opacity: 0;
    }
  `;
  document.head.appendChild(style);
}
