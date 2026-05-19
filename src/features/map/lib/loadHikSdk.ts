const HIK_SDK_BASE = '/hik-sdk';

const SCRIPT_URLS = [
  `${HIK_SDK_BASE}/dist/jsPlugin-3.0.0.min.js`,
  `${HIK_SDK_BASE}/dist/jquery-1.12.1.min.js`,
  `${HIK_SDK_BASE}/dist/jquery.cookie.js`,
  `${HIK_SDK_BASE}/dist/cryptico.min.js`,
  `${HIK_SDK_BASE}/hppuikit.js`,
] as const;

let loadPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-hik-sdk="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed: ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.hikSdk = src;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load Hik SDK script: ${src}`));
    document.head.appendChild(script);
  });
}

/** โหลด jsPlugin + jQuery + hppuikit ตามลำดับที่ demo กำหนด */
export function loadHikSdk(): Promise<void> {
  if (typeof window !== 'undefined' && window.HPPUIKitPlayer) {
    return Promise.resolve();
  }
  if (!loadPromise) {
    loadPromise = (async () => {
      for (const url of SCRIPT_URLS) {
        await loadScript(url);
      }
      if (!window.HPPUIKitPlayer) {
        throw new Error('HPPUIKitPlayer is not available after loading scripts');
      }
    })().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

export const HIK_PLUGIN_PATH = `${HIK_SDK_BASE}/dist`;
