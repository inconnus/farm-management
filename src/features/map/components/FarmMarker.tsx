import type { LandData } from '@shared/types/lands';
import { FarmSatelliteImage } from './FarmSatelliteImage';
import { MapMarkerMount } from './MapMarkerMount';

export type FarmMarkerData = {
  id: string;
  name: string;
  /** Fallback image when satellite URL cannot be built */
  image: string;
  lands: Pick<LandData, 'coords' | 'color'>[];
  lat: number;
  lng: number;
};

type FarmMarkerFaceProps = {
  item: FarmMarkerData;
  onClick?: (farm: FarmMarkerData) => void;
};

export function FarmMarkerFace({ item: farm, onClick }: FarmMarkerFaceProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(farm);
      }}
      className="group flex flex-col items-center cursor-pointer transition-transform origin-bottom hover:scale-110 active:scale-95"
      style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}
    >
      {/* Rounded square bubble with satellite image */}
      <div className="relative w-12 h-12 rounded-2xl border-2 border-white/80 bg-white/80 overflow-hidden shadow-lg group-hover:border-green-400 transition-colors">
        <FarmSatelliteImage
          lands={farm.lands}
          fallbackSrc={farm.image}
          lat={farm.lat}
          lng={farm.lng}
          width={48}
          height={48}
          padding={15}
          alt={farm.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Pin tail */}
      <div
        className="w-0 h-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '8px solid white',
          marginTop: '-1px',
        }}
      />
    </button>
  );
}

type FarmMarkerProps = {
  farm: FarmMarkerData;
  onClick?: (farm: FarmMarkerData) => void;
};

export function FarmMarker({ farm, onClick }: FarmMarkerProps) {
  return (
    <MapMarkerMount
      lat={farm.lat}
      lng={farm.lng}
      onClick={() => onClick?.(farm)}
      anchor="bottom"
    >
      <FarmMarkerFace item={farm} onClick={onClick} />
    </MapMarkerMount>
  );
}
