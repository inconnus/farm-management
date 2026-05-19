import { HIK_PLUGIN_PATH, loadHikSdk } from '@features/map/lib/loadHikSdk';
import type { HikCameraParams } from '@features/map/types/hikUIKit';
import { useEffect, useRef, useState } from 'react';

type HikUIKitPlayerProps = {
  params: HikCameraParams;
  /** id คงที่ต่อกล้อง — ช่วยให้ plugin bind DOM ซ้ำได้บน prod */
  instanceKey: string;
  className?: string;
};

const MIN_W = 320;
const MIN_H = 180;
const CONNECT_MAX_FRAMES = 120;

/**
 * Live preview ผ่าน Hikvision ISGP (HPPUIKitPlayer + jsPlugin)
 * ต้องมี assets ใน /public/hik-sdk/
 */
export function HikUIKitPlayer({ params, instanceKey, className }: HikUIKitPlayerProps) {
  const containerId = `hik-uikit-${instanceKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<InstanceType<NonNullable<typeof window.HPPUIKitPlayer>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let attempts = 0;
    let resizeObserver: ResizeObserver | undefined;
    let playRafId = 0;
    let hideLoadingTimer = 0;

    const clearLoading = () => {
      if (!cancelled) {
        setLoading(false);
      }
    };

    const mountPlayer = async () => {
      const node = containerRef.current;
      if (!node || cancelled) return;

      if (!document.documentElement.contains(node)) {
        attempts += 1;
        if (attempts < CONNECT_MAX_FRAMES) {
          rafId = requestAnimationFrame(() => {
            void mountPlayer();
          });
        }
        return;
      }

      try {
        await loadHikSdk();
        if (cancelled || !containerRef.current) return;

        const el = containerRef.current;
        const w = Math.max(el.clientWidth, MIN_W);
        const h = Math.max(el.clientHeight, MIN_H);

        if (!window.HPPUIKitPlayer) {
          throw new Error('HPPUIKitPlayer is not available');
        }

        const PlayerCtor = window.HPPUIKitPlayer;
        const player = new PlayerCtor({
          wndId: containerId,
          accessToken: params.accessToken,
          width: w,
          height: h,
          pluginPath: HIK_PLUGIN_PATH,
          deviceSerial: params.deviceSerial,
          channelNo: params.channelNo ?? 1,
          code: params.code ?? '',
          quality: params.quality ?? 1,
          method: params.method ?? 2,
          pluginErrorHandler: (iWndIndex, iErrorCode, oError) => {
            console.error('[HikUIKit]', iWndIndex, iErrorCode, oError);
            if (!cancelled) {
              clearLoading();
              setError(`ข้อผิดพลาดกล้อง (${iErrorCode})`);
            }
          },
          performanceLack: () => {
            console.warn('[HikUIKit] Insufficient performance');
          },
          onStreamStart: () => {
            if (!cancelled) {
              clearLoading();
              setError(null);
            }
          },
          onFirstFrame: () => {
            if (!cancelled) {
              clearLoading();
              setError(null);
            }
          },
          onPlayError: (message) => {
            if (!cancelled) {
              clearLoading();
              setError(message);
            }
          },
        });
        playerRef.current = player;

        await player.whenReady?.();
        if (cancelled || !playerRef.current) return;

        hideLoadingTimer = window.setTimeout(clearLoading, 5000);

        // รอ DOM + canvas ของ plugin พร้อมก่อน realplay (สำคัญเมื่อเปิด popup ซ้ำ)
        playRafId = requestAnimationFrame(() => {
          playRafId = requestAnimationFrame(() => {
            if (cancelled || !playerRef.current) return;
            playerRef.current.realplay();
          });
        });

        resizeObserver = new ResizeObserver(() => {
          const target = containerRef.current;
          if (!target || !playerRef.current) return;
          const rw = Math.max(target.clientWidth, MIN_W);
          const rh = Math.max(target.clientHeight, MIN_H);
          playerRef.current.resize(rw, rh);
        });
        resizeObserver.observe(el);
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          setError(err instanceof Error ? err.message : 'โหลด SDK ไม่สำเร็จ');
        }
      }
    };

    void mountPlayer();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(playRafId);
      window.clearTimeout(hideLoadingTimer);
      resizeObserver?.disconnect();
      const player = playerRef.current;
      playerRef.current = null;
      if (player?.destroy) {
        void Promise.resolve(player.destroy()).catch(() => {
          /* ignore teardown errors */
        });
      }
    };
  }, [
    containerId,
    instanceKey,
    params.accessToken,
    params.deviceSerial,
    params.channelNo,
    params.code,
    params.quality,
    params.method,
  ]);

  return (
    <div className={`relative ${className ?? 'h-full w-full min-h-[180px] bg-black'}`}>
      <div
        ref={containerRef}
        id={containerId}
        className="h-full w-full min-h-[180px] bg-[#4C4B4B]"
      />
      {loading && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-white text-sm pointer-events-none">
          กำลังเชื่อมต่อกล้อง…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-red-300 text-xs px-4 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
