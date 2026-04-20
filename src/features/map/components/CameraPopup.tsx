import { Column, Row } from '@app/layout';
import { Card } from '@heroui/react';
import { CctvIcon } from 'lucide-react';
import ReactPlayer from 'react-player';
import type { CameraData } from './CameraMarker';
import { WebRTCPlayer } from './WebRTCPlayer';

// const Player = ReactPlayer as any;

type CameraPopupProps = {
  camera: CameraData;
  url: string;
};

const VideoContent = ({ camera, url }: CameraPopupProps) => {
  if (camera.webrtcUrl) {
    return <WebRTCPlayer url={camera.webrtcUrl} />;
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
  return (
    <Column className="items-center justify-center h-full gap-3 text-gray-400">
      <CctvIcon size={36} />
      <span className="text-sm">ไม่มีสัญญาณภาพ</span>
    </Column>
  );
};

export const CameraPopup = ({ camera, url }: CameraPopupProps) => {
  return (
    <Card className="flex w-[380px] flex-col overflow-hidden border-none rounded-3xl bg-white/85 p-0 shadow-2xl backdrop-blur-xl gap-0">
      <div className="relative  w-full shrink-0 overflow-hidden bg-gray-900 rounded-t-3xl">
        {camera.webrtcUrl ? <VideoContent camera={camera} url={url} /> : <ReactPlayer src={url} autoPlay width={'100%'} height={'100%'} />}
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
