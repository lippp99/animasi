import type { ChapterBadgeCue, HudBadge } from '../../types/episode';
import type { WorldSpec } from '../../types/world';
import { RENDER_CONFIG } from '../../core/tokens';

export const EPISODE_META = {
  id: 'ain-jalut-1260',
  title: 'Jebakan Maut Ain Jalut 1260: Taktik Pasukan Islam Menghentikan Mongol!',
  fps: RENDER_CONFIG.fps,
  totalFrames: 3600,
  badge: {
    era: '3 SEPTEMBER 1260',
    location: 'AIN JALUT',
  } satisfies HudBadge,
  chapterBadges: [
    {
      startFrame: 6,
      durationFrames: 210,
      era: '3 SEPTEMBER 1260',
      location: 'AIN JALUT',
    },
  ] satisfies readonly ChapterBadgeCue[],
} as const;

/**
 * Jezreel Valley Low-Poly Toon staging around the spring of Ain Jalut:
 * Clean central valley flanked by sculpted ambush hills, pine groves, war carts, tents, and fortress ruins.
 */
export const EPISODE_WORLD: WorldSpec = {
  defaultMood: 'dawn',
  defaultWeather: 'fog_wisps',
  terrain: {
    groundColor: 0x869e54,
    groundAccent: 0xb89a5e,
    waterColor: 0x357ea8,
    waterLevel: -0.52,
    showWater: true,
    seed: 1260,
    materialKind: 'earth_grass',
  },
  props: [
    // Western ambush ridge (cutaway target hillside concealing Mamluk left wing)
    { kind: 'stone_tower', position: [-15.8, 0, -9.5], rotationY: 0.35, scale: 0.85, accentColor: 0x8c4f32 },
    { kind: 'pine_tree', position: [-10.5, 0, -2.5], rotationY: 0.4, scale: 1.25 },
    { kind: 'pine_tree', position: [-12.2, 0, 2.2], rotationY: 1.1, scale: 1.35 },
    { kind: 'pine_tree', position: [-9.8, 0, 6.4], rotationY: 2.1, scale: 1.18 },
    { kind: 'boulder', position: [-7.6, 0, -1.2], rotationY: 0.3, scale: 1.25 },
    { kind: 'boulder', position: [-8.4, 0, 4.8], rotationY: 1.4, scale: 1.1 },
    // Eastern ambush ridge (fortress ruin & pine cover concealing Mamluk right wing)
    { kind: 'fortress_wall', position: [16.5, 0, -10.5], rotationY: -0.6, scale: 0.85 },
    { kind: 'pine_tree', position: [9.6, 0, -4.2], rotationY: 0.8, scale: 1.2 },
    { kind: 'pine_tree', position: [11.4, 0, 1.6], rotationY: 1.9, scale: 1.32 },
    { kind: 'boulder', position: [7.4, 0, -2.0], rotationY: 0.7, scale: 1.2 },
    { kind: 'boulder', position: [8.2, 0, 4.4], rotationY: 2.0, scale: 1.15 },
    // Southern Mamluk command overlook, supply cart & war standards
    { kind: 'banner_pole', position: [-3.8, 0, 8.2], rotationY: 0.25, scale: 1.05, accentColor: 0xd4a428 },
    { kind: 'banner_pole', position: [3.6, 0, 8.0], rotationY: -0.2, scale: 1.05, accentColor: 0x1e7a4a },
    { kind: 'brazier', position: [-4.6, 0, 7.2], rotationY: 0, scale: 0.9 },
    { kind: 'brazier', position: [4.4, 0, 7.0], rotationY: 0, scale: 0.9 },
    { kind: 'tent', position: [-7.2, 0, 10.6], rotationY: 0.5, scale: 1.1, accentColor: 0x1d6b42 },
    { kind: 'tent', position: [6.8, 0, 10.8], rotationY: -0.4, scale: 1.05, accentColor: 0xc99a2e },
    { kind: 'war_cart', position: [-5.6, 0, 9.8], rotationY: 0.65, scale: 0.95 },
    // Northern Mongol advance banners & valley timber markers
    { kind: 'banner_pole', position: [-4.4, 0, -12.4], rotationY: 0.1, scale: 1.08, accentColor: 0xb02328 },
    { kind: 'banner_pole', position: [4.2, 0, -12.6], rotationY: -0.15, scale: 1.08, accentColor: 0xb02328 },
    { kind: 'timber_log', position: [-5.4, 0, -6.4], rotationY: 0.4, scale: 1.0 },
    { kind: 'timber_log', position: [5.2, 0, -6.8], rotationY: -0.35, scale: 1.0 },
    { kind: 'boulder', position: [0.2, 0, -14.8], rotationY: 0.9, scale: 1.4 },
  ],
};
