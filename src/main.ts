import type { EngineBridge } from './types/episode';
import { AnimationEngine } from './core/engine';
import { createEpisodeRegistry } from './episodes/index';

declare global {
  interface Window {
    __ANIMASI__?: EngineBridge;
  }
}

function bootstrap(): void {
  const mount = document.getElementById('app');
  if (mount === null) {
    throw new Error('Root element "#app" not found.');
  }

  const registry = createEpisodeRegistry();
  const params = new URLSearchParams(window.location.search);
  const episodeParam = params.get('episode') ?? undefined;
  const isRenderMode = params.get('render') === '1';

  const engine = new AnimationEngine(mount, registry, episodeParam);
  window.__ANIMASI__ = engine;

  const updateFit = (): void => {
    engine.fitToViewport(isRenderMode);
  };
  updateFit();
  window.addEventListener('resize', updateFit);

  engine.seekFrame(0);

  // Interactive preview loops deterministically by frame index; headless render steps manually.
  if (!isRenderMode) {
    let previewFrame = 0;
    const total = engine.getMeta().totalFrames;
    const tick = (): void => {
      engine.seekFrame(previewFrame);
      previewFrame = (previewFrame + 1) % total;
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  }
}

bootstrap();
