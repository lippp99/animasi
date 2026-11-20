import type { EpisodeSpec } from '../types/episode';
import { EpisodeRegistry } from '../core/registry';
import { EPISODE_AIN_JALUT_1260 } from './ain-jalut-1260/index';
// [AUTO-IMPORT]

const REGISTERED_EPISODES: readonly EpisodeSpec[] = [
  EPISODE_AIN_JALUT_1260,
  // [AUTO-REGISTER]
];

export function createEpisodeRegistry(): EpisodeRegistry {
  const registry = new EpisodeRegistry();
  for (const episode of REGISTERED_EPISODES) {
    registry.register(episode);
  }
  return registry;
}

export function resolveEpisode(slug?: string): EpisodeSpec {
  const registry = createEpisodeRegistry();
  return slug !== undefined && slug.trim().length > 0
    ? registry.get(slug.trim())
    : registry.getDefault();
}

export function listEpisodeSlugs(): readonly string[] {
  return createEpisodeRegistry().listIds();
}
