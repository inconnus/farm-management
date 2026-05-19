import HlsPlayer from '@ezuikit/player-hls';
import { useEffect, useRef } from 'react';

type EzvizHlsPlayerProps = {
  url: string;
  className?: string;
};

const MIN_W = 320;
const MIN_H = 180;
/** รอจน portal (เช่น Mapbox Popup) ยัด div เข้า document — @ezuikit ใช้ getElementById */
const CONNECT_MAX_FRAMES = 120;

/**
 * HLS จาก Hikvision / Ezviz ที่เข้ารหัสหรือ H.265 — ใช้ @ezuikit/player-hls + WASM
 * (ต้องมี /decoder.worker.js และ /decoder.wasm ใน public)
 */
export function EzvizHlsPlayer({ url, className }: EzvizHlsPlayerProps) {
  const containerIdRef = useRef<string | null>(null);
  if (containerIdRef.current === null) {
    containerIdRef.current = `ezviz-hls-${crypto.randomUUID()}`;
  }
  const containerId = containerIdRef.current;

  const playerRef = useRef<HlsPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let attempts = 0;

    const tryMountPlayer = () => {
      if (cancelled) {
        return;
      }
      const node = containerRef.current;
      if (!node) {
        return;
      }

      if (!document.documentElement.contains(node)) {
        attempts += 1;
        if (attempts < CONNECT_MAX_FRAMES) {
          rafId = requestAnimationFrame(tryMountPlayer);
        }
        return;
      }

      const w = Math.max(node.clientWidth, MIN_W);
      const h = Math.max(node.clientHeight, MIN_H);

      playerRef.current?.destroy();
      playerRef.current = new HlsPlayer({
        id: containerId,
        url,
        staticPath: '/',
        disableCollect: true,
        autoPlay: true,
        controls: true,
        volume: 0,
        width: w,
        height: h,
      });
    };

    tryMountPlayer();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [url, containerId]);

  return (
    <div
      ref={containerRef}
      id={containerId}
      className={className ?? 'h-full w-full min-h-[180px] bg-black'}
    />
  );
}
