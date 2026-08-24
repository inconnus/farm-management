import type { DbDevice } from '@features/devices/hooks/useDevicesQuery';
import {
  type WaterLevelMqttConfig,
  useWaterLevelMqtt,
} from '@features/map/hooks/useWaterLevelMqtt';
import { WavesIcon } from 'lucide-react';
import { MapMarkerMount } from './MapMarkerMount';

export type WaterLevelData = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  maxDepthCm: number;
  unit: string;
  mqtt: WaterLevelMqttConfig | null;
};

export function toWaterLevelData(device: DbDevice): WaterLevelData {
  const config = (device.config ?? {}) as Record<string, unknown>;
  const mqttUrl =
    typeof config.mqtt_url === 'string' ? config.mqtt_url.trim() : '';
  const mqttTopic =
    typeof config.mqtt_topic === 'string' ? config.mqtt_topic.trim() : '';

  return {
    id: device.id,
    name: device.name,
    lat: device.lat,
    lng: device.lng,
    maxDepthCm: (config.max_depth_cm as number) ?? 200,
    unit: (config.unit as string) ?? 'cm',
    mqtt:
      mqttUrl && mqttTopic
        ? {
            url: mqttUrl,
            topic: mqttTopic,
            username:
              typeof config.mqtt_username === 'string'
                ? config.mqtt_username
                : undefined,
            password:
              typeof config.mqtt_password === 'string'
                ? config.mqtt_password
                : undefined,
          }
        : null,
  };
}

function formatLevel(value: number | null): string {
  if (value === null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

type WaterLevelMarkerFaceProps = {
  item: WaterLevelData;
  onClick?: (device: WaterLevelData) => void;
};

export function WaterLevelMarkerFace({
  item: device,
  onClick,
}: WaterLevelMarkerFaceProps) {
  const mqtt = useWaterLevelMqtt(device.mqtt);
  const levelCm = mqtt.value;
  const scaleMax = Math.max(device.maxDepthCm, levelCm ?? 0, 1);
  const pct =
    levelCm === null ? 0 : Math.min(100, Math.max(0, (levelCm / scaleMax) * 100));

  const statusLabel =
    mqtt.status === 'connected'
      ? levelCm === null
        ? 'รอข้อมูล…'
        : null
      : mqtt.status === 'connecting'
        ? 'กำลังเชื่อมต่อ…'
        : mqtt.status === 'error'
          ? 'MQTT error'
          : 'ไม่มี MQTT';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(device);
      }}
      className="group flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-110"
    >
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-sky-500/85 to-blue-700/85 border-2 border-sky-300/60 shadow-lg backdrop-blur-sm group-hover:border-sky-200 group-hover:shadow-sky-500/30 transition-all overflow-hidden">
        <div
          className="absolute inset-x-0 bottom-0 bg-sky-300/40 transition-all duration-500"
          style={{ height: `${pct}%` }}
        />
        <WavesIcon
          size={20}
          className="relative text-white group-hover:text-sky-100 transition-colors"
        />
        {mqtt.status === 'connected' && levelCm !== null && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-black/30 animate-pulse" />
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[11px] text-white bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 whitespace-nowrap border border-white/10">
          {device.name}
        </span>
        <span className="text-[9px] text-white/90 bg-sky-900/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 font-mono border border-white/10">
          {statusLabel ?? `${formatLevel(levelCm)} ${device.unit}`}
        </span>
      </div>
    </button>
  );
}

type WaterLevelMarkerProps = {
  device: WaterLevelData;
  onClick?: (device: WaterLevelData) => void;
};

export const WaterLevelMarker = ({
  device,
  onClick,
}: WaterLevelMarkerProps) => (
  <MapMarkerMount id={device.id} lat={device.lat} lng={device.lng}>
    <WaterLevelMarkerFace item={device} onClick={onClick} />
  </MapMarkerMount>
);
