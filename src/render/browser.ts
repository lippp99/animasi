import { existsSync } from 'node:fs';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { RENDER_CONFIG } from '../core/tokens';

export interface WebGlRendererReport {
  readonly vendor: string;
  readonly renderer: string;
  readonly isSoftwareFallback: boolean;
}

const CANDIDATE_BROWSER_PATHS: readonly string[] = [
  process.env.CHROME_PATH ?? '',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export function resolveBrowserExecutable(): string {
  for (const candidate of CANDIDATE_BROWSER_PATHS) {
    if (candidate.length > 0 && existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    'No local Chromium/Chrome/Edge executable found. Set CHROME_PATH env var to a valid browser binary.',
  );
}

/**
 * Launches Chromium with hardware ANGLE Direct3D 11 WebGL enabled for Intel UHD Graphics.
 * Uses --headless=new so Windows D3D11 GPU compositing is active instead of SwiftShader.
 */
export async function launchHardwareRenderBrowser(): Promise<{
  browser: Browser;
  context: BrowserContext;
}> {
  const executablePath = resolveBrowserExecutable();
  const isWindows = process.platform === 'win32';

  const args: string[] = [
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--enable-gpu',
    '--enable-webgl',
    '--enable-accelerated-2d-canvas',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    `--window-size=${RENDER_CONFIG.width},${RENDER_CONFIG.height}`,
  ];

  if (isWindows) {
    args.push('--use-angle=d3d11', '--disable-gpu-sandbox');
  }

  const browser = await chromium.launch({
    executablePath,
    headless: false, // Controlled explicitly via --headless=new for true D3D11 GPU acceleration
    args,
  });

  const context = await browser.newContext({
    viewport: { width: RENDER_CONFIG.width, height: RENDER_CONFIG.height },
    deviceScaleFactor: 1,
  });

  return { browser, context };
}

export async function createEnginePage(
  context: BrowserContext,
  targetUrl: string,
): Promise<Page> {
  const page = await context.newPage();
  page.on('pageerror', (err) => {
    console.error('[Browser PageError]', err);
  });
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__ANIMASI__ !== undefined, undefined, {
    timeout: 15000,
  });
  return page;
}

/** Reads WEBGL_debug_renderer_info from the active Three.js canvas to verify hardware GPU usage. */
export async function inspectWebGlRenderer(page: Page): Promise<WebGlRendererReport> {
  return page.evaluate((): WebGlRendererReport => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas.stage-canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl') ?? null;
    if (gl === null) {
      return { vendor: 'unknown', renderer: 'no-webgl-context', isSoftwareFallback: true };
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor =
      ext !== null
        ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL))
        : String(gl.getParameter(gl.VENDOR));
    const renderer =
      ext !== null
        ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
        : String(gl.getParameter(gl.RENDERER));

    const lower = renderer.toLowerCase();
    const isSoftwareFallback =
      lower.includes('swiftshader') ||
      lower.includes('llvmpipe') ||
      lower.includes('software') ||
      lower.includes('microsoft basic render');

    return { vendor, renderer, isSoftwareFallback };
  });
}
