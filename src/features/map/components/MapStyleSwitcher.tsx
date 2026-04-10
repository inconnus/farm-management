import { mapInstanceAtom } from '@store/mapStore';
import { useAtomValue } from 'jotai';
import { Box, Orbit } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type MapStyleOption = {
  id: string;
  label: string;
  style: string;
  thumbnail: string;
};

const MAP_STYLES: MapStyleOption[] = [
  {
    id: 'satellite',
    label: 'ดาวเทียม',
    style: 'mapbox://styles/mapbox/standard-satellite',
    thumbnail: '/images/map-styles/satellite.png',
  },
  {
    id: 'light',
    label: 'สว่าง',
    style: 'mapbox://styles/mapbox/standard',
    thumbnail: '/images/map-styles/light.png',
  },
  {
    id: 'dark',
    label: 'มืด',
    style: 'mapbox://styles/mapbox/dark-v11',
    thumbnail: '/images/map-styles/dark.png',
  },
];

const thumbnailBtnClass =
  'relative w-[72px] h-[72px]  rounded-[10px] overflow-hidden shadow-sm cursor-pointer p-0 bg-transparent shrink-0 transition-all duration-200  hover:scale-105';

const thumbnailRingClass =
  'border-[#4fc3f7] shadow-[0_0_0_2px_rgba(79,195,247,0.45),0_2px_12px_rgba(0,0,0,0.35)]';

export const MapStyleSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStyle, setActiveStyle] = useState<string>('satellite');
  const [isPerspective, setIsPerspective] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const map = useAtomValue(mapInstanceAtom);

  const handleSelect = useCallback(
    (option: MapStyleOption) => {
      if (!map) return;
      setActiveStyle(option.id);
      setIsOpen(false);
      map.setStyle(option.style);
    },
    [map],
  );

  const togglePerspective = useCallback(() => {
    if (!map) return;
    const next = !isPerspective;
    setIsPerspective(next);
    map.easeTo({
      pitch: next ? 60 : 0,
      bearing: next ? -20 : 0,
      duration: 600,
    });
  }, [map, isPerspective]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption =
    MAP_STYLES.find((s) => s.id === activeStyle) ?? MAP_STYLES[0];
  const otherOptions = MAP_STYLES.filter((s) => s.id !== activeStyle);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-10 left-4 z-20 flex flex-col items-start gap-2"
    >
      {/* Perspective toggle */}
      <button
        type="button"
        className={`flex items-center justify-center bg-black/30 gap-1 w-[72px] h-[34px]  rounded-[10px] cursor-pointer p-0 backdrop-blur-sm text-white shrink-0 transition-all duration-200 hover:border-white hover:bg-black/60 hover:shadow-lg hover:scale-105`}
        onClick={togglePerspective}
        title={isPerspective ? 'มุมมองบน' : 'มุมมอง 3 มิติ'}
      >
        {isPerspective ? <Box size={20} /> : <Orbit size={20} />}
        <span className="text-[11px] font-semibold tracking-wide">
          {isPerspective ? '2D' : '3D'}
        </span>
      </button>

      {/* Map style row */}
      <div className="flex flex-row items-end gap-1.5">
        {/* Active style button */}
        <button
          type="button"
          className={`${thumbnailBtnClass} ${isOpen ? thumbnailRingClass : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <img
            src={activeOption.thumbnail}
            alt={activeOption.label}
            className="w-full h-full object-cover block"
            draggable={false}
          />
          <span className="absolute bottom-0 left-0 right-0 py-0.5 text-[10px] font-medium text-white text-center bg-gradient-to-t from-black/70 to-transparent pointer-events-none leading-snug">
            {activeOption.label}
          </span>
        </button>

        {/* Expandable options */}
        <div
          className="flex flex-row gap-1.5 overflow-hidden transition-all duration-250 ease-out"
          style={{
            maxWidth: isOpen ? '300px' : '0px',
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        >
          {otherOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={thumbnailBtnClass}
              onClick={() => handleSelect(option)}
            >
              <img
                src={option.thumbnail}
                alt={option.label}
                className="w-full h-full object-cover block"
                draggable={false}
              />
              <span className="absolute bottom-0 left-0 right-0 py-0.5 text-[10px] font-medium text-white text-center bg-gradient-to-t from-black/70 to-transparent pointer-events-none leading-snug">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
