import type { ChapterBadgeCue, EpisodeSpec, InfographicCallout, SubtitleCue } from '../types/episode';
import { applyEasing, clamp } from '../core/math';
import { OVERLAY_TOKENS } from '../core/tokens';
import { injectOverlayStyles } from './styles';

export interface OverlayTransitionState {
  readonly fadeBlackAlpha: number;
  readonly occlusionWipeProgress: number;
  readonly lightFlareAlpha: number;
}

function buildIconSvg(icon: InfographicCallout['icon']): string {
  const stroke = OVERLAY_TOKENS.accentAmber;
  switch (icon) {
    case 'ship':
      return `<svg width="46" height="46" viewBox="0 0 48 48" fill="none">
        <path d="M8 32L14 40H34L40 32H8Z" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M24 8V32M24 10L36 24H24" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    case 'wall':
      return `<svg width="46" height="46" viewBox="0 0 48 48" fill="none">
        <path d="M8 38V14H16V20H22V14H28V20H34V14H40V38H8Z" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
      </svg>`;
    case 'flame':
      return `<svg width="46" height="46" viewBox="0 0 48 48" fill="none">
        <path d="M24 8C30 16 36 21 36 29C36 35.6 30.6 40 24 40C17.4 40 12 35.6 12 29C12 23.5 16 19 20 15C20 19 22 21 24 21C25.5 16.5 25 12 24 8Z" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
      </svg>`;
    case 'compass':
      return `<svg width="46" height="46" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="16" stroke="${stroke}" stroke-width="3"/>
        <path d="M30 18L26 26L18 30L22 22L30 18Z" fill="${stroke}"/>
      </svg>`;
  }
}

export function resolveActiveChapterBadge(
  episode: EpisodeSpec,
  frame: number,
): { readonly cue: ChapterBadgeCue; readonly alpha: number; readonly slideX: number } | null {
  const cues: readonly ChapterBadgeCue[] =
    episode.chapterBadges !== undefined && episode.chapterBadges.length > 0
      ? episode.chapterBadges
      : [
          {
            startFrame: 0,
            durationFrames: OVERLAY_TOKENS.badgeDefaultDurationFrames,
            era: episode.badge.era,
            location: episode.badge.location,
          },
        ];

  const active = cues.find(
    (c) => frame >= c.startFrame && frame < c.startFrame + c.durationFrames,
  );
  if (active === undefined) return null;

  const fade = OVERLAY_TOKENS.badgeFadeFrames;
  const local = frame - active.startFrame;
  const remain = active.startFrame + active.durationFrames - frame;
  const enterT = applyEasing('easeOutQuart', clamp(local / fade, 0, 1));
  const exitT = clamp(remain / fade, 0, 1);

  return {
    cue: active,
    alpha: enterT * exitT,
    slideX: (1 - enterT) * -28,
  };
}

export class OverlayRenderer {
  private readonly badgeEl: HTMLDivElement;
  private readonly eraYearEl: HTMLSpanElement;
  private readonly eraLocEl: HTMLSpanElement;
  private readonly calloutEl: HTMLDivElement;
  private readonly subtitleBox: HTMLDivElement;
  private readonly speakerEl: HTMLDivElement;
  private readonly textEl: HTMLDivElement;
  private readonly veilEl: HTMLDivElement;
  private readonly occlusionEl: HTMLDivElement;
  private readonly flareEl: HTMLDivElement;

  public constructor(stageShell: HTMLElement) {
    injectOverlayStyles();

    const layer = document.createElement('div');
    layer.className = 'hud-layer';

    const top = document.createElement('div');
    top.className = 'hud-top';

    this.badgeEl = document.createElement('div');
    this.badgeEl.className = 'era-badge';
    this.eraYearEl = document.createElement('span');
    this.eraYearEl.className = 'era-year';
    const divider = document.createElement('span');
    divider.className = 'era-divider';
    this.eraLocEl = document.createElement('span');
    this.eraLocEl.className = 'era-location';
    this.badgeEl.append(this.eraYearEl, divider, this.eraLocEl);

    this.calloutEl = document.createElement('div');
    this.calloutEl.className = 'callout-card';
    this.calloutEl.style.display = 'none';

    top.append(this.badgeEl, this.calloutEl);

    const bottom = document.createElement('div');
    bottom.className = 'hud-bottom';

    this.subtitleBox = document.createElement('div');
    this.subtitleBox.className = 'subtitle-box';
    this.speakerEl = document.createElement('div');
    this.speakerEl.className = 'subtitle-speaker';
    this.textEl = document.createElement('div');
    this.textEl.className = 'subtitle-text';
    this.subtitleBox.append(this.speakerEl, this.textEl);
    bottom.append(this.subtitleBox);

    layer.append(top, bottom);

    this.veilEl = document.createElement('div');
    this.veilEl.className = 'transition-veil';
    this.veilEl.style.opacity = '0';

    this.occlusionEl = document.createElement('div');
    this.occlusionEl.className = 'transition-occlusion';

    this.flareEl = document.createElement('div');
    this.flareEl.className = 'transition-flare';

    stageShell.append(layer, this.occlusionEl, this.flareEl, this.veilEl);
  }

  public update(
    episode: EpisodeSpec,
    frame: number,
    transitions: OverlayTransitionState,
  ): void {
    this.renderChapterBadge(episode, frame);
    this.veilEl.style.opacity = String(clamp(transitions.fadeBlackAlpha, 0, 1));
    this.flareEl.style.opacity = clamp(transitions.lightFlareAlpha, 0, 1).toFixed(3);

    const wipe = transitions.occlusionWipeProgress;
    if (wipe > 0 && wipe < 1) {
      const pct = -70 + wipe * 240;
      this.occlusionEl.style.opacity = '1';
      this.occlusionEl.style.transform = `translateX(${pct.toFixed(1)}%) skewX(-8deg)`;
    } else {
      this.occlusionEl.style.opacity = '0';
    }

    const activeCallout = episode.callouts.find(
      (c) => frame >= c.startFrame && frame < c.endFrame,
    );
    this.renderCallout(activeCallout, frame);

    const activeSub = episode.subtitles.find((s) => frame >= s.startFrame && frame < s.endFrame);
    this.renderSubtitle(activeSub, frame);
  }

  private renderChapterBadge(episode: EpisodeSpec, frame: number): void {
    const resolved = resolveActiveChapterBadge(episode, frame);
    if (resolved === null) {
      this.badgeEl.style.display = 'none';
      return;
    }
    this.badgeEl.style.display = 'inline-flex';
    this.badgeEl.style.opacity = resolved.alpha.toFixed(3);
    this.badgeEl.style.transform = `translateX(${resolved.slideX.toFixed(1)}px)`;
    this.eraYearEl.textContent = resolved.cue.era;
    this.eraLocEl.textContent = resolved.cue.location;
  }

  private renderCallout(callout: InfographicCallout | undefined, frame: number): void {
    if (callout === undefined) {
      this.calloutEl.style.display = 'none';
      return;
    }
    const enterT = applyEasing('easeOutBack', clamp((frame - callout.startFrame) / 18, 0, 1));
    const exitT = clamp((callout.endFrame - frame) / 14, 0, 1);
    const alpha = Math.min(1, enterT) * exitT;

    this.calloutEl.style.display = 'inline-flex';
    this.calloutEl.style.opacity = alpha.toFixed(3);
    this.calloutEl.style.transform = `translateX(${((1 - enterT) * -32).toFixed(1)}px)`;
    this.calloutEl.innerHTML = `
      ${buildIconSvg(callout.icon)}
      <div>
        <div class="callout-metric">${escapeHtml(callout.metric)}</div>
        <div class="callout-label">${escapeHtml(callout.label)}</div>
      </div>
    `;
  }

  private renderSubtitle(cue: SubtitleCue | undefined, frame: number): void {
    if (cue === undefined) {
      this.subtitleBox.style.opacity = '0';
      return;
    }
    const enterT = applyEasing('easeOutBack', clamp((frame - cue.startFrame) / 14, 0, 1));
    const exitT = clamp((cue.endFrame - frame) / 10, 0, 1);
    const scale = 0.94 + 0.06 * enterT;

    this.subtitleBox.style.opacity = (Math.min(1, enterT) * exitT).toFixed(3);
    this.subtitleBox.style.transform = `scale(${scale.toFixed(3)})`;

    if (cue.speaker !== undefined) {
      this.speakerEl.style.display = 'block';
      this.speakerEl.textContent = cue.speaker;
    } else {
      this.speakerEl.style.display = 'none';
    }

    if (cue.highlightWord !== undefined && cue.text.includes(cue.highlightWord)) {
      const safeWord = escapeHtml(cue.highlightWord);
      const safeText = escapeHtml(cue.text);
      this.textEl.innerHTML = safeText.replace(
        safeWord,
        `<span class="subtitle-highlight">${safeWord}</span>`,
      );
    } else {
      this.textEl.textContent = cue.text;
    }
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
