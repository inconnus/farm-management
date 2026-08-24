import type { HikCameraParams } from '@features/map/types/hikUIKit';
import { EZUIKitPlayer } from 'ezuikit-js';
import { useEffect, useRef, useState } from 'react';

type HikUIKitPlayerProps = {
  params: HikCameraParams;
  instanceKey: string;
  className?: string;
};

const API_LIVE_ADDRESS =
  'https://isgp.hik-partner.com/api/hpcgw/v1/device/live/address/get';
const HIK_ISGP_DOMAIN = 'https://isgpopen.ezvizlife.com';
const MIN_W = 320;
const MIN_H = 180;
const CONNECT_MAX_FRAMES = 120;

const baseUrl = import.meta.env.BASE_URL ?? '/';
const EZUIKIT_STATIC_PATH = `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}ezuikit_static`;

function decodeTicket(ticket: string): string {
  if (!ticket) return '';
  try {
    return atob(ticket);
  } catch {
    return ticket;
  }
}

/**
 * Live preview ผ่าน ezuikit-js — ดึง url/ticket จาก ISGP แล้วเล่นด้วย EZUIKitPlayer
 */
export function HikUIKitPlayer({
  params,
  instanceKey,
  className,
}: HikUIKitPlayerProps) {
  const containerId = `hik-ezuikit-${instanceKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const playerRef = useRef<EZUIKitPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let hideLoadingTimer = 0;
    let resizeObserver: ResizeObserver | undefined;
    const abort = new AbortController();

    const clearLoading = () => {
      if (!cancelled) setLoading(false);
    };

    const onFirstFrame = () => {
      if (!cancelled) {
        clearLoading();
        setError(null);
      }
    };

    const waitForHost = (): HTMLElement | null => {
      const host = document.getElementById(containerId);
      if (host && document.documentElement.contains(host)) return host;
      return null;
    };

    const initPlayer = async () => {
      let attempts = 0;
      while (!waitForHost() && attempts < CONNECT_MAX_FRAMES && !cancelled) {
        attempts += 1;
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }

      const host = waitForHost();
      if (!host || cancelled) return;

      try {
        const res = await fetch(API_LIVE_ADDRESS, {
          method: 'POST',
          signal: abort.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${params.accessToken ?? ''}`,
          },
          body: JSON.stringify({
            deviceSerial: params.deviceSerial,
            channelNo: params.channelNo ?? 1,
            code: params.code ?? '',
            quality: params.quality ?? 1,
          }),
        });

        const json = (await res.json()) as {
          data?: { url?: string; ticket?: string };
          msg?: string;
          message?: string;
        };

        if (!res.ok || !json.data?.url) {
          const msg =
            json.msg || json.message || res.statusText || 'ไม่ทราบสาเหตุ';
          throw new Error(`${msg}${res.status ? ` (${res.status})` : ''}`);
        }

        if (cancelled) return;

        const url = json.data.url;
        const accessToken = decodeTicket(json.data.ticket ?? '');
        const w = Math.max(host.clientWidth, MIN_W);
        const h = Math.max(host.clientHeight, MIN_H);

        if (playerRef.current) {
          try {
            playerRef.current.stop();
            playerRef.current.destroy();
          } catch {
            /* ignore */
          }
          playerRef.current = null;
        }

        const player = new EZUIKitPlayer({
          id: containerId,
          url,
          accessToken,
          width: w,
          height: h,
          template: 'simple',
          scaleMode: 1,
          staticPath: EZUIKIT_STATIC_PATH,
          language: 'zh',
          env: { domain: HIK_ISGP_DOMAIN },
          streamInfoCBType: 1,
          loggerOptions: {
            level: 'WARN',
            name: 'ezuikit',
            showTime: false,
          },
          handleError: (err) => {
            if (cancelled) return;
            clearLoading();
            if (
              err.type === 'handleRunTimeInfoError' &&
              err.data?.nErrorCode === 5
            ) {
              setError('รหัสผ่านอุปกรณ์ไม่ถูกต้อง');
              return;
            }
            setError('เล่นวิดีโอไม่สำเร็จ');
          },
        });

        playerRef.current = player;

        player.eventEmitter.on(
          EZUIKitPlayer.EVENTS.firstFrameDisplay,
          onFirstFrame,
        );
        hideLoadingTimer = window.setTimeout(clearLoading, 8000);

        resizeObserver = new ResizeObserver(() => {
          const el = document.getElementById(containerId);
          const current = playerRef.current;
          if (!el || !current) return;
          try {
            current.reSize(
              Math.max(el.clientWidth, MIN_W),
              Math.max(el.clientHeight, MIN_H),
            );
          } catch {
            /* ignore */
          }
        });
        resizeObserver.observe(host);
      } catch (err) {
        if (cancelled || abort.signal.aborted) return;
        clearLoading();
        setError(err instanceof Error ? err.message : 'เชื่อมต่อกล้องไม่สำเร็จ');
      }
    };

    void initPlayer();

    return () => {
      cancelled = true;
      abort.abort();
      window.clearTimeout(hideLoadingTimer);
      resizeObserver?.disconnect();

      const player = playerRef.current;
      playerRef.current = null;
      if (player) {
        try {
          player.eventEmitter.off(
            EZUIKitPlayer.EVENTS.firstFrameDisplay,
            onFirstFrame,
          );
          player.stop();
          player.destroy();
        } catch {
          /* ignore */
        }
      }
    };
  }, [
    containerId,
    params.accessToken,
    params.deviceSerial,
    params.channelNo,
    params.code,
    params.quality,
  ]);

  return (
    <div
      className={`relative ${className ?? 'h-full w-full min-h-[180px] bg-black'}`}
    >
      <div
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
