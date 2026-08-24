import { GlowingPin } from '@features/dashboard/components/markers/glowing_pin';
import type { DbDevice } from '@features/devices/hooks/useDevicesQuery';
import { MapMarkerMount } from './MapMarkerMount';

export type SensorData = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  appIotId: string;
  province?: string;
  amphur?: string;
  tambon?: string;
};

export function readAppIotId(device: DbDevice): string | null {
  const config = (device.config ?? {}) as Record<string, unknown>;
  const id = config.app_iot_id;
  return typeof id === 'string' && id.trim() !== '' ? id : null;
}

export function toSensorData(device: DbDevice): SensorData {
  const config = (device.config ?? {}) as Record<string, unknown>;
  return {
    id: device.id,
    name: device.name,
    lat: device.lat,
    lng: device.lng,
    appIotId: (config.app_iot_id as string) ?? '',
    province: config.province as string | undefined,
    amphur: config.amphur as string | undefined,
    tambon: config.tambon as string | undefined,
  };
}

type SensorMarkerFaceProps = {
  item: SensorData;
  isOnline?: boolean;
  onClick?: (sensor: SensorData) => void;
};

export function SensorMarkerFace({
  item: sensor,
  isOnline = false,
  onClick,
}: SensorMarkerFaceProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(sensor);
      }}
      className="group flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-110"
    >
      <GlowingPin isOnline={isOnline} />
      <span className="text-[11px] text-white bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 whitespace-nowrap border border-white/10 max-w-[120px] truncate">
        {sensor.name}
      </span>
    </button>
  );
}

type SensorMarkerProps = {
  sensor: SensorData;
  isOnline?: boolean;
  onClick?: (sensor: SensorData) => void;
};

export function SensorMarker({ sensor, isOnline, onClick }: SensorMarkerProps) {
  return (
    <MapMarkerMount id={sensor.id} lat={sensor.lat} lng={sensor.lng}>
      <SensorMarkerFace item={sensor} isOnline={isOnline} onClick={onClick} />
    </MapMarkerMount>
  );
}
