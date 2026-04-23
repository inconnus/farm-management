import type { DbDevice } from '@features/devices/hooks/useDevicesQuery';
import { SunIcon } from 'lucide-react';
import { MapMarkerMount } from './MapMarkerMount';

export type LightData = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isOn: boolean;
  brightness: number;
  colorTempK: number;
};

export function toLightData(device: DbDevice): LightData {
  const config = (device.config ?? {}) as Record<string, unknown>;
  return {
    id: device.id,
    name: device.name,
    lat: device.lat,
    lng: device.lng,
    isOn: (config.is_on as boolean) ?? false,
    brightness: (config.brightness as number) ?? 100,
    colorTempK: (config.color_temp_k as number) ?? 4000,
  };
}

type LightMarkerFaceProps = {
  item: LightData;
  onClick?: (light: LightData) => void;
};

export function LightMarkerFace({ item: light, onClick }: LightMarkerFaceProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(light);
      }}
      className="group flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-110"
    >
      <div
        className={[
          'relative flex items-center justify-center w-9 h-9 rounded-full border-2 shadow-lg backdrop-blur-sm transition-all',
          light.isOn
            ? 'bg-yellow-400/80 border-yellow-200/80 group-hover:border-yellow-100 group-hover:shadow-yellow-400/40'
            : 'bg-black/60 border-white/30 group-hover:border-white/60',
        ].join(' ')}
      >
        <SunIcon
          size={18}
          className={light.isOn ? 'text-white group-hover:text-yellow-100 transition-colors' : 'text-white/60 group-hover:text-white transition-colors'}
        />
        {light.isOn && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-yellow-300 border border-black/30 animate-pulse" />
        )}
      </div>
      <span className="text-[11px] text-white bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 whitespace-nowrap border border-white/10">
        {light.name}
      </span>
    </button>
  );
}

type LightMarkerProps = {
  light: LightData;
  onClick?: (light: LightData) => void;
};

export const LightMarker = ({ light, onClick }: LightMarkerProps) => (
  <MapMarkerMount lat={light.lat} lng={light.lng}>
    <LightMarkerFace item={light} onClick={onClick} />
  </MapMarkerMount>
);
