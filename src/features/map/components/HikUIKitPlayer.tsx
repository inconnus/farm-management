import { DEFAULT_EZVIZ_STREAM_QUALITY } from '@features/camera/data/streamQuality';
import type { HikCameraParams } from '@features/map/types/hikUIKit';
import { EZUIKitPlayer } from 'ezuikit-js';
import { useCallback, useEffect, useRef, useState } from 'react';

type HikUIKitPlayerProps = {
  params: HikCameraParams;
  instanceKey: string;
  className?: string;
  /** เปลี่ยนเมื่อ grid layout เปลี่ยน — trigger reSize */
  layoutRevision?: number;
  /** ไม่ใส่ min-height สำหรับ grid cell */
  fillContainer?: boolean;
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
  layoutRevision = 0,
  fillContainer = false,
}: HikUIKitPlayerProps) {
  const containerId = `hik-ezuikit-${instanceKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const playerRef = useRef<EZUIKitPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const measurePlayerSize = useCallback((): { w: number; h: number } | null => {
    const el = document.getElementById(containerId);
    if (!el) return null;

    const fsEl = document.fullscreenElement;
    const inFullscreen = fsEl !== null && fsEl.contains(el);

    if (inFullscreen) {
      return { w: window.innerWidth, h: window.innerHeight };
    }

    const gridCell = el.closest('.camera-grid-cell');
    const videoLayer = el.closest('.camera-fs-video-layer');
    const measureEl = gridCell ?? videoLayer ?? el.parentElement ?? el;
    const rect = measureEl.getBoundingClientRect();

    return {
      w: Math.max(Math.round(rect.width), MIN_W),
      h: Math.max(Math.round(rect.height), MIN_H),
    };
  }, [containerId]);

  const resizePlayer = useCallback(() => {
    const el = document.getElementById(containerId);
    const current = playerRef.current;
    const size = measurePlayerSize();
    if (!el || !current || !size) return;

    el.style.width = '';
    el.style.height = '';
    el.style.minHeight = '';

    try {
      current.reSize(size.w, size.h);
    } catch {
      /* ignore */
    }
  }, [containerId, measurePlayerSize]);

  const scheduleResize = useCallback(() => {
    requestAnimationFrame(() => {
      resizePlayer();
      requestAnimationFrame(() => resizePlayer());
    });
    window.setTimeout(resizePlayer, 50);
    window.setTimeout(resizePlayer, 150);
    window.setTimeout(resizePlayer, 300);
  }, [resizePlayer]);

  useEffect(() => {
    if (layoutRevision > 0) scheduleResize();
  }, [layoutRevision, scheduleResize]);

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

    const onFullscreenChange = () => {
      scheduleResize();
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);

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
            quality: params.quality ?? DEFAULT_EZVIZ_STREAM_QUALITY,
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
        const size = measurePlayerSize();
        const w = size?.w ?? Math.max(host.clientWidth, MIN_W);
        const h = size?.h ?? Math.max(host.clientHeight, MIN_H);

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
          resizePlayer();
        });
        resizeObserver.observe(host);
        const videoLayer = host.closest('.camera-fs-video-layer');
        if (videoLayer) resizeObserver.observe(videoLayer);
        const gridCell = host.closest('.camera-grid-cell');
        if (gridCell) resizeObserver.observe(gridCell);
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
      document.removeEventListener('fullscreenchange', onFullscreenChange);

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
    measurePlayerSize,
    resizePlayer,
    scheduleResize,
  ]);

  const minHClass = fillContainer ? 'min-h-0' : 'min-h-[180px]';

  return (
    <div
      className={`relative ${className ?? `h-full w-full ${minHClass} bg-black`}`}
    >
      <div
        id={containerId}
        className={`h-full w-full ${minHClass} bg-[#4C4B4B]`}
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
