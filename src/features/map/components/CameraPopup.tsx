import { Column, Row } from '@app/layout';
import { getKasetkornAuthContext } from '@features/auth/kasetkornAuth';
import { authModeAtom, pluksangSessionAtom } from '@features/auth/store';
import { PtzControlPad } from '@features/camera/components/PtzControlPad';
import {
  DEFAULT_EZVIZ_STREAM_QUALITY,
  EZVIZ_QUALITY_OPTIONS,
  type EzvizStreamQuality,
} from '@features/camera/data/streamQuality';
import { useEzvizPtz } from '@features/camera/hooks/useEzvizPtz';
import { isEzvizCamera } from '@features/camera/utils/cameraVendor';
import { fetchCameraToken } from '@features/dashboard/data/api';
import type { HikCameraParams } from '@features/map/types/hikUIKit';
import { Card } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { CctvIcon, Maximize2, Minimize2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import type { CameraData } from './CameraMarker';
import { EzvizHlsPlayer } from './EzvizHlsPlayer';
import { HikUIKitPlayer } from './HikUIKitPlayer';
import { WebRTCPlayer } from './WebRTCPlayer';

function isM3u8Url(u: string) {
  return /\.m3u8(\?|$)/i.test(u);
}

type CameraPopupProps = {
  camera: CameraData;
  /** fallback เมื่อไม่มี webrtc / m3u8 / stream ใน config */
  url?: string;
};

function CameraPtzSection({ camera }: { camera: CameraData }) {
  const deviceSerial =
    camera.deviceSerial ?? camera.hik?.deviceSerial ?? '';
  const isEzviz = isEzvizCamera(deviceSerial);
  const showPtz =
    isEzviz && camera.isPTZ && camera.canControl && deviceSerial.trim();

  const { onDirectionChanged, enabled } = useEzvizPtz(
    deviceSerial,
    showPtz,
  );

  if (!showPtz) return null;

  return (
    <Column className="px-4 py-3 gap-3 border-t border-gray-100">
      <Column className="gap-1">
        <span className="text-sm font-semibold text-gray-900">ควบคุม PTZ</span>
        <span className="text-xs text-gray-500">
          กดค้างเพื่อเลื่อนกล้อง ปล่อยเพื่อหยุด
        </span>
      </Column>
      <PtzControlPad enabled={enabled} onDirectionChanged={onDirectionChanged} />
    </Column>
  );
}

function HikLivePlayer({
  cameraId,
  hik,
  quality,
}: {
  cameraId: string;
  hik: HikCameraParams;
  quality: EzvizStreamQuality;
}) {
  const authMode = useAtomValue(authModeAtom);
  const pluksangSession = useAtomValue(pluksangSessionAtom);
  const auth = getKasetkornAuthContext(authMode, pluksangSession);
  const storedToken = hik.accessToken?.trim() || '';
  const tokenQuery = useQuery({
    queryKey: [
      'camera-access-token',
      auth.scope,
      auth.scope === 'farmer' ? auth.appFarmerId : null,
    ] as const,
    queryFn: () => fetchCameraToken(auth),
    enabled: !storedToken,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const accessToken = storedToken || tokenQuery.data || '';

  if (!hik.deviceSerial) {
    return (
      <Column className="items-center justify-center h-full w-full gap-3 text-gray-400 bg-gray-900">
        <CctvIcon size={36} />
        <span className="text-sm text-center px-4">
          ตั้งค่า Hik ไม่ครบ (ต้องมี deviceSerial)
        </span>
      </Column>
    );
  }

  if (!storedToken && tokenQuery.isLoading) {
    return (
      <Column className="items-center justify-center h-full w-full gap-3 text-gray-300 bg-gray-900">
        <CctvIcon size={36} />
        <span className="text-sm">กำลังขอ access token…</span>
      </Column>
    );
  }

  if (!accessToken) {
    return (
      <Column className="items-center justify-center h-full w-full gap-3 text-red-300 bg-gray-900">
        <CctvIcon size={36} />
        <span className="text-sm text-center px-4">
          {tokenQuery.error instanceof Error
            ? tokenQuery.error.message
            : 'ขอ camera access token ไม่สำเร็จ'}
        </span>
      </Column>
    );
  }

  const params: HikCameraParams = {
    ...hik,
    accessToken,
    quality,
  };

  return (
    <HikUIKitPlayer
      key={`${cameraId}-${accessToken.slice(0, 12)}-${quality}`}
      instanceKey={`${cameraId}-${quality}`}
      params={params}
      className="h-full w-full"
    />
  );
}

function CameraVideoBody({
  camera,
  url,
  streamQuality,
}: CameraPopupProps & { streamQuality: EzvizStreamQuality }) {
  if (camera.mode === 'hik') {
    if (!camera.hik?.deviceSerial) {
      return (
        <Column className="items-center justify-center h-full w-full gap-3 text-gray-400 bg-gray-900">
          <CctvIcon size={36} />
          <span className="text-sm text-center px-4">
            ตั้งค่า Hik ไม่ครบ (ต้องมี deviceSerial)
          </span>
        </Column>
      );
    }
    return (
      <HikLivePlayer
        cameraId={camera.id}
        hik={camera.hik}
        quality={streamQuality}
      />
    );
  }
  if (camera.webrtcUrl) {
    return <WebRTCPlayer url={camera.webrtcUrl} />;
  }
  if (camera.m3u8Url) {
    if (camera.isHikvision) {
      return <EzvizHlsPlayer url={camera.m3u8Url} className="h-full w-full" />;
    }
    return (
      <ReactPlayer
        src={camera.m3u8Url}
        playing
        controls
        width="100%"
        height="100%"
      />
    );
  }
  if (camera.streamUrl) {
    return (
      <iframe
        src={camera.streamUrl}
        title={camera.name}
        className="w-full h-full border-0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }
  if (url) {
    if (camera.isHikvision && isM3u8Url(url)) {
      return <EzvizHlsPlayer url={url} className="h-full w-full" />;
    }
    return (
      <ReactPlayer src={url} playing controls width="100%" height="100%" />
    );
  }
  return (
    <Column className="items-center justify-center h-full w-full gap-3 text-gray-400 bg-gray-900">
      <CctvIcon size={36} />
      <span className="text-sm">ไม่มีสัญญาณภาพ</span>
    </Column>
  );
}

export const CameraPopup = ({ camera, url }: CameraPopupProps) => {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [streamQuality, setStreamQuality] = useState<EzvizStreamQuality>(
    DEFAULT_EZVIZ_STREAM_QUALITY,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isEzvizStream = camera.mode === 'hik';

  useEffect(() => {
    setStreamQuality(DEFAULT_EZVIZ_STREAM_QUALITY);
  }, [camera.id]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const nowFullscreen =
        document.fullscreenElement === videoContainerRef.current;
      setIsFullscreen(nowFullscreen);
      if (!nowFullscreen) {
        // รอ layout กลับขนาด popup แล้วสั่ง resize player
        window.setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = videoContainerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // ignore — browser may block fullscreen
    }
  }, []);

  const showPtzSection =
    isEzvizCamera(camera.deviceSerial ?? camera.hik?.deviceSerial) &&
    camera.isPTZ &&
    camera.canControl;

  return (
    <Card
      className={`flex flex-col overflow-hidden border-none rounded-3xl bg-white/85 p-0 shadow-2xl backdrop-blur-xl gap-0 ${
        showPtzSection ? 'w-[380px]' : 'w-[380px]'
      }`}
    >
      <div
        ref={videoContainerRef}
        className="relative w-full shrink-0 overflow-hidden bg-gray-900 rounded-t-3xl aspect-video camera-fs-host"
      >
        <div className="camera-fs-video-layer absolute inset-0 w-full h-full">
          <CameraVideoBody
            camera={camera}
            url={url}
            streamQuality={streamQuality}
          />
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        {isEzvizStream ? (
          <div className="absolute top-3 right-3 z-20 pointer-events-auto">
            <Row className="gap-0.5 rounded-full bg-black/45 backdrop-blur-sm p-0.5 border border-white/10">
              {EZVIZ_QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStreamQuality(opt.value)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                    streamQuality === opt.value
                      ? 'bg-white text-gray-900'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </Row>
          </div>
        ) : null}
        <div className="absolute top-3 left-4 pointer-events-none">
          <Row className="items-center gap-1.5">
            <span className="text-[11px] text-green-400 bg-green-500/20 backdrop-blur-sm rounded-full px-2 py-0.5 border border-green-400/20">
              LIVE
            </span>
            {camera.isPTZ ? (
              <span className="text-[11px] text-blue-300 bg-blue-500/20 backdrop-blur-sm rounded-full px-2 py-0.5 border border-blue-400/20">
                PTZ
              </span>
            ) : null}
          </Row>
        </div>
        <div className="absolute bottom-3 left-4 right-14 pointer-events-none">
          <Row className="items-center gap-2">
            <CctvIcon size={14} className="text-white/80" />
            <h3 className="text-sm font-bold text-white drop-shadow-md">
              {camera.name}
            </h3>
          </Row>
        </div>
        <button
          type="button"
          aria-label={isFullscreen ? 'ออกจากเต็มหน้าจอ' : 'เต็มหน้าจอ'}
          onClick={() => void toggleFullscreen()}
          className="absolute bottom-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm border border-white/10 transition hover:bg-black/60 pointer-events-auto"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      <Column className="px-4 py-3 gap-1">
        <Row className="items-center justify-between text-xs text-gray-500">
          <span>
            ตำแหน่ง: {camera.lat.toFixed(6)}, {camera.lng.toFixed(6)}
          </span>
        </Row>
      </Column>

      <CameraPtzSection camera={camera} />
    </Card>
  );
};
