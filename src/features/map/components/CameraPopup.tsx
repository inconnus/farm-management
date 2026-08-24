import { Column, Row } from '@app/layout';
import { fetchCameraToken } from '@features/dashboard/data/api';
import type { HikCameraParams } from '@features/map/types/hikUIKit';
import { Card } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { CctvIcon } from 'lucide-react';
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

function HikLivePlayer({
  cameraId,
  hik,
}: {
  cameraId: string;
  hik: HikCameraParams;
}) {
  const storedToken = hik.accessToken?.trim() || '';
  const tokenQuery = useQuery({
    queryKey: ['camera-access-token'] as const,
    queryFn: fetchCameraToken,
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
  };

  return (
    <HikUIKitPlayer
      key={`${cameraId}-${accessToken.slice(0, 12)}`}
      instanceKey={cameraId}
      params={params}
      className="h-full w-full"
    />
  );
}

function CameraVideoBody({ camera, url }: CameraPopupProps) {
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
    return <HikLivePlayer cameraId={camera.id} hik={camera.hik} />;
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
  return (
    <Card className="flex w-[380px] flex-col overflow-hidden border-none rounded-3xl bg-white/85 p-0 shadow-2xl backdrop-blur-xl gap-0">
      <div className="relative w-full shrink-0 overflow-hidden bg-gray-900 rounded-t-3xl aspect-video">
        <div className="absolute inset-0">
          <CameraVideoBody camera={camera} url={url} />
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-3 left-4">
          <Row className="items-center gap-1.5">
            <span className="text-[11px] text-green-400 bg-green-500/20 backdrop-blur-sm rounded-full px-2 py-0.5 border border-green-400/20">
              LIVE
            </span>
          </Row>
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <Row className="items-center gap-2">
            <CctvIcon size={14} className="text-white/80" />
            <h3 className="text-sm font-bold text-white drop-shadow-md">
              {camera.name}
            </h3>
          </Row>
        </div>
      </div>

      <Column className="px-4 py-3 gap-1">
        <Row className="items-center justify-between text-xs text-gray-500">
          <span>
            ตำแหน่ง: {camera.lat.toFixed(6)}, {camera.lng.toFixed(6)}
          </span>
        </Row>
      </Column>
    </Card>
  );
};
