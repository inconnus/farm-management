import type { DbDevice } from '@features/devices/hooks/useDevicesQuery';
import { CctvIcon } from 'lucide-react';
import { MapMarkerMount } from './MapMarkerMount';

export type CameraData = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  webrtcUrl?: string;
  streamUrl?: string;
};

export function toCameraData(device: DbDevice): CameraData {
  const config = (device.config ?? {}) as Record<string, unknown>;
  return {
    id: device.id,
    name: device.name,
    lat: device.lat,
    lng: device.lng,
    webrtcUrl: (config.webrtc_url as string) || undefined,
    streamUrl: (config.stream_url as string) || undefined,
  };
}

type CameraMarkerFaceProps = {
  item: CameraData;
  onClick?: (camera: CameraData) => void;
};

export function CameraMarkerFace({
  item: camera,
  onClick,
}: CameraMarkerFaceProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(camera);
      }}
      className="group flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-110"
    >
      <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-black/60 border-2 border-white/60 shadow-lg backdrop-blur-sm group-hover:border-green-400 group-hover:bg-black/80 transition-colors">
        <CctvIcon
          size={18}
          className="text-white group-hover:text-green-400 transition-colors"
        />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-black/50 animate-pulse" />
      </div>
      <span className="text-[11px] text-white bg-black/50 backdrop-blur-sm rounded-full  px-1.5 py-0.5 whitespace-nowrap border border-white/10">
        {camera.name}
      </span>
    </button>
  );
}

type CameraMarkerProps = {
  camera: CameraData;
  onClick?: (camera: CameraData) => void;
};

export const CameraMarker = ({ camera, onClick }: CameraMarkerProps) => (
  <MapMarkerMount lat={camera.lat} lng={camera.lng}>
    <CameraMarkerFace item={camera} onClick={onClick} />
  </MapMarkerMount>
);
