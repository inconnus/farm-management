/** Base URL สำหรับ static assets ใน public/ (รองรับ deploy ใต้ subpath) */
function publicAssetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}${relativePath.replace(/^\//, '')}`;
}

/** โฟลเดอร์ public/hik-sdk — อย่าใช้ชื่อ `dist` (ถูก .gitignore บล็อก) */
export const HIK_SDK_BASE = publicAssetUrl('hik-sdk');
const HIK_PLUGIN_DIR = 'plugin';

const SCRIPT_URLS = [
  `${HIK_SDK_BASE}/${HIK_PLUGIN_DIR}/playctrl/Decoder.js`,
  `${HIK_SDK_BASE}/${HIK_PLUGIN_DIR}/jsPlugin-3.0.0.min.js`,
  `${HIK_SDK_BASE}/${HIK_PLUGIN_DIR}/jquery-1.12.1.min.js`,
  `${HIK_SDK_BASE}/${HIK_PLUGIN_DIR}/jquery.cookie.js`,
  `${HIK_SDK_BASE}/${HIK_PLUGIN_DIR}/cryptico.min.js`,
  `${HIK_SDK_BASE}/hppuikit.js`,
] as const;

let loadPromise: Promise<void> | null = null;

async function assertScriptIsJavaScript(src: string): Promise<void> {
  const res = await fetch(src, { method: 'GET', cache: 'force-cache' });
  if (!res.ok) {
    throw new Error(
      `Hik SDK script not found (${res.status}): ${src}. ตรวจว่า deploy รวม public/hik-sdk/plugin`,
    );
  }
  const head = (await res.text()).slice(0, 80).trimStart();
  if (head.startsWith('<')) {
    throw new Error(
      `Hik SDK got HTML instead of JS at ${src}. มักเกิดจากไฟล์ไม่ถูก deploy หรือ SPA fallback — ต้อง commit public/hik-sdk/plugin`,
    );
  }
}

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
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load Hik SDK script: ${src}`)),
        { once: true },
      );
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
    script.onerror = () =>
      reject(
        new Error(
          `Failed to load Hik SDK script: ${src}. ตรวจ Network ว่าได้ไฟล์ .js จริง ไม่ใช่ index.html`,
        ),
      );
    document.head.appendChild(script);
  });
}

/** โหลด Decoder + jsPlugin + jQuery + hppuikit ตามลำดับที่ demo กำหนด */
export function loadHikSdk(): Promise<void> {
  if (typeof window !== 'undefined' && window.HPPUIKitPlayer && window.JSPlugin) {
    return Promise.resolve();
  }
  if (!loadPromise) {
    loadPromise = (async () => {
      for (const url of SCRIPT_URLS) {
        await assertScriptIsJavaScript(url);
        await loadScript(url);
      }
      if (!window.HPPUIKitPlayer) {
        throw new Error('HPPUIKitPlayer is not available after loading scripts');
      }
      if (!window.JSPlugin) {
        throw new Error('JSPlugin is not available after loading scripts');
      }
    })().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

export const HIK_PLUGIN_PATH = `${HIK_SDK_BASE}/${HIK_PLUGIN_DIR}`;
