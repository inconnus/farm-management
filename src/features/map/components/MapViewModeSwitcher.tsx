import { mapViewModeAtom } from '@shared/store/mapStore';
import { useAtomValue, useSetAtom } from 'jotai';
import { CctvIcon, MapIcon } from 'lucide-react';

export function MapViewModeSwitcher() {
  const mode = useAtomValue(mapViewModeAtom);
  const setMode = useSetAtom(mapViewModeAtom);

  return (
    <div className="absolute top-3 left-1/2 z-50 -translate-x-1/2 pointer-events-none">
      <div className="pointer-events-auto grid grid-cols-2 gap-0.5 rounded-xl bg-white/90 backdrop-blur-xl p-0.5 shadow-lg border border-gray-200/80">
        <button
          type="button"
          onClick={() => setMode('map')}
          className={`flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            mode === 'map'
              ? 'bg-[#03662c] text-white shadow-sm'
              : 'text-gray-600 hover:bg-black/5'
          }`}
        >
          <MapIcon size={14} />
          <span>แผนที่</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('camera-grid')}
          className={`flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            mode === 'camera-grid'
              ? 'bg-[#03662c] text-white shadow-sm'
              : 'text-gray-600 hover:bg-black/5'
          }`}
        >
          <CctvIcon size={14} />
          <span>ตารางกล้อง</span>
        </button>
      </div>
    </div>
  );
}
