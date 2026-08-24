import type { VehicleData } from '@features/vehicles/types';
import {
  getVehicleTypeMeta,
  VehicleTypeIcon,
} from '@features/vehicles/utils/vehicleDisplay';
import { MapMarkerMount } from './MapMarkerMount';

const STATUS_DOT: Record<VehicleData['status'], string> = {
  working: 'bg-emerald-500 animate-pulse',
  idle: 'bg-sky-400',
  charging: 'bg-amber-400 animate-pulse',
  offline: 'bg-gray-400',
};

type VehicleMarkerFaceProps = {
  item: VehicleData;
  onClick?: (vehicle: VehicleData) => void;
};

export function VehicleMarkerFace({
  item: vehicle,
  onClick,
}: VehicleMarkerFaceProps) {
  const meta = getVehicleTypeMeta(vehicle.type);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(vehicle);
      }}
      className="group flex flex-col items-center cursor-pointer drop-shadow-lg"
      aria-label={vehicle.jobTitle}
    >
      <div
        className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-white/80 shadow-md transition-colors ${meta.markerBg} ${meta.markerBgHover} ${meta.markerBorderHover}`}
      >
        <VehicleTypeIcon
          type={vehicle.type}
          size={20}
          className={meta.markerIcon}
          style={
            vehicle.type === 'drone'
              ? { transform: `rotate(${vehicle.heading}deg)` }
              : undefined
          }
        />
        <span
          className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white/80 ${STATUS_DOT[vehicle.status]}`}
        />
      </div>
      <span
        className="block w-0 h-0 -mt-px border-l-[7px] border-r-[7px] border-t-[11px] border-l-transparent border-r-transparent border-t-white drop-shadow-sm"
        aria-hidden
      />
    </button>
  );
}

type VehicleMarkerProps = {
  vehicle: VehicleData;
  onClick?: (vehicle: VehicleData) => void;
};

/** @deprecated ใช้ VehicleMapMarkerOverlay แทน */
export const VehicleMarker = ({ vehicle, onClick }: VehicleMarkerProps) => (
  <MapMarkerMount
    id={vehicle.id}
    lat={vehicle.lat}
    lng={vehicle.lng}
    anchor="bottom"
  >
    <VehicleMarkerFace item={vehicle} onClick={onClick} />
  </MapMarkerMount>
);
