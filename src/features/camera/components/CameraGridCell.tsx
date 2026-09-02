import type { CameraData } from '@features/map/components';
import { DEFAULT_EZVIZ_STREAM_QUALITY } from '@features/camera/data/streamQuality';
import { HikUIKitPlayer } from '@features/map/components/HikUIKitPlayer';
import { CctvIcon } from 'lucide-react';

type CameraGridCellProps = {
  camera?: CameraData;
  accessToken?: string;
  selected?: boolean;
  onSelect?: () => void;
  empty?: boolean;
  layoutRevision?: number;
};

export function CameraGridCell({
  camera,
  accessToken = '',
  selected = false,
  onSelect,
  empty = false,
  layoutRevision = 0,
}: CameraGridCellProps) {
  if (empty || !camera) {
    return (
      <div className="relative h-full w-full min-h-0 bg-gray-950 border border-gray-800 flex items-center justify-center">
        <CctvIcon size={20} className="text-gray-800" />
      </div>
    );
  }

  const hik = camera.hik;

  if (!hik?.deviceSerial) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`relative h-full w-full min-h-0 bg-gray-900 border flex items-center justify-center ${
          selected ? 'border-green-500 ring-2 ring-green-500/50' : 'border-gray-800'
        }`}
      >
        <ColumnPlaceholder name={camera.name} message="ไม่รองรับสตรีมสด" />
      </button>
    );
  }

  const params = {
    ...hik,
    accessToken,
    quality: DEFAULT_EZVIZ_STREAM_QUALITY,
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`camera-grid-cell relative flex flex-col min-h-0 min-w-0 h-full w-full p-0 bg-black border text-left overflow-hidden ${
        selected
          ? 'border-green-500 ring-2 ring-green-500/50 z-10'
          : 'border-gray-800 hover:border-gray-600'
      }`}
    >
      <div className="relative flex-1 min-h-0 w-full">
        <HikUIKitPlayer
          instanceKey={`grid-${camera.id}`}
          params={params}
          className="absolute inset-0 h-full w-full"
          fillContainer
          layoutRevision={layoutRevision}
        />
      </div>
      <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none">
        <span className="text-[10px] text-green-400 bg-green-500/20 backdrop-blur-sm rounded px-1 py-0.5 border border-green-400/20">
          LIVE
        </span>
        {camera.isPTZ ? (
          <span className="ml-1 text-[10px] text-blue-300 bg-blue-500/20 backdrop-blur-sm rounded px-1 py-0.5 border border-blue-400/20">
            PTZ
          </span>
        ) : null}
      </div>
      <div className="absolute bottom-0 inset-x-0 z-10 pointer-events-none bg-linear-to-t from-black/80 to-transparent px-2 pt-3 pb-1">
        <span className="text-[11px] font-medium text-white truncate block">
          {camera.name}
        </span>
      </div>
    </button>
  );
}

function ColumnPlaceholder({ name, message }: { name: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-gray-500 px-2 text-center">
      <CctvIcon size={20} className="text-gray-600" />
      <span className="text-[11px] font-medium text-gray-400 truncate max-w-full">
        {name}
      </span>
      <span className="text-[10px]">{message}</span>
    </div>
  );
}
