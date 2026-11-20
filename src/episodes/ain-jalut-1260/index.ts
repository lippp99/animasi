import type { EpisodeSpec } from '../../types/episode';
import { EPISODE_META, EPISODE_WORLD } from './meta';
import { EPISODE_CHARACTERS, EPISODE_CROWDS } from './cast';
import {
  EPISODE_AUDIO_CUES,
  EPISODE_CALLOUTS,
  EPISODE_SFX,
  EPISODE_SUBTITLES,
} from './narration';
import { SHOTS_PART_1 } from './shots-part1';
import { SHOTS_PART_2 } from './shots-part2';

export const EPISODE_AIN_JALUT_1260: EpisodeSpec = {
  ...EPISODE_META,
  world: EPISODE_WORLD,
  characters: EPISODE_CHARACTERS,
  crowds: EPISODE_CROWDS,
  shots: [...SHOTS_PART_1, ...SHOTS_PART_2],
  subtitles: EPISODE_SUBTITLES,
  callouts: EPISODE_CALLOUTS,
  audioCues: EPISODE_AUDIO_CUES,
  sfx: EPISODE_SFX,
};
