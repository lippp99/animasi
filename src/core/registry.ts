import type { EpisodeSpec } from '../types/episode';

export class EpisodeRegistry {
  private readonly episodes = new Map<string, EpisodeSpec>();

  public register(episode: EpisodeSpec): void {
    this.episodes.set(episode.id, episode);
  }

  public get(id: string): EpisodeSpec {
    const found = this.episodes.get(id);
    if (found === undefined) {
      const available = [...this.episodes.keys()].join(', ');
      throw new Error(`Episode "${id}" not found. Available: ${available}`);
    }
    return found;
  }

  public getDefault(): EpisodeSpec {
    const first = this.episodes.values().next().value;
    if (first === undefined) {
      throw new Error('No episodes registered in EpisodeRegistry.');
    }
    return first;
  }

  public listIds(): readonly string[] {
    return [...this.episodes.keys()];
  }
}
