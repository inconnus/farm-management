import type { DbDevice } from '@features/devices/hooks/useDevicesQuery';
import { SolarPanelIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MapMarkerMount } from './MapMarkerMount';

export type SolarCellData = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacityKw: number;
  panelCount: number;
};

export function toSolarCellData(device: DbDevice): SolarCellData {
  const config = (device.config ?? {}) as Record<string, unknown>;
  return {
    id: device.id,
    name: device.name,
    lat: device.lat,
    lng: device.lng,
    capacityKw: (config.capacity_kw as number) ?? 5,
    panelCount: (config.panel_count as number) ?? 10,
  };
}

function useDummyPower(capacityKw: number) {
  const [power, setPower] = useState(() => capacityKw * 0.7);

  useEffect(() => {
    const interval = setInterval(() => {
      const base = capacityKw * 0.6;
      const variation = capacityKw * 0.35;
      setPower(base + Math.random() * variation);
    }, 3000);
    return () => clearInterval(interval);
  }, [capacityKw]);

  return power;
}

type SolarCellMarkerFaceProps = {
  item: SolarCellData;
  onClick?: (device: SolarCellData) => void;
};

export function SolarCellMarkerFace({
  item: device,
  onClick,
}: SolarCellMarkerFaceProps) {
  const currentPower = useDummyPower(device.capacityKw);
  const pct = Math.min(100, (currentPower / device.capacityKw) * 100);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(device);
      }}
      className="group flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-110"
    >
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-amber-500/80 to-orange-600/80 border-2 border-amber-300/60 shadow-lg backdrop-blur-sm group-hover:border-yellow-300 group-hover:shadow-amber-500/30 transition-all">
        <SolarPanelIcon
          size={20}
          className="text-white group-hover:text-yellow-200 transition-colors"
        />
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[11px] text-white bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 whitespace-nowrap border border-white/10">
          {device.name}
        </span>
        {/* <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/10">
          <div className="w-[40px] h-[4px] rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${pct}%`,
                backgroundColor:
                  pct > 70 ? '#22c55e' : pct > 40 ? '#eab308' : '#ef4444',
              }}
            />
          </div>
          <span className="text-[9px] text-white/80 font-mono">
            {currentPower.toFixed(1)} kW
          </span>
        </div> */}
      </div>
    </button>
  );
}

type SolarCellMarkerProps = {
  device: SolarCellData;
  onClick?: (device: SolarCellData) => void;
};

export const SolarCellMarker = ({ device, onClick }: SolarCellMarkerProps) => (
  <MapMarkerMount lat={device.lat} lng={device.lng}>
    <SolarCellMarkerFace item={device} onClick={onClick} />
  </MapMarkerMount>
);
