import { mapInstanceAtom } from '@store/mapStore';
import { useAtomValue } from 'jotai';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { vehicleMapPathsAtom } from '../store/vehicleMapPathsAtom';

function coordsToSvgD(coords: [number, number][], map: mapboxgl.Map): string {
  if (coords.length < 2) return '';
  return coords
    .map(([lng, lat], i) => {
      const { x, y } = map.project([lng, lat]);
      return `${i === 0 ? 'M' : 'L'} ${Math.round(x)} ${Math.round(y)}`;
    })
    .join(' ');
}

/** SVG overlay — แสดงเส้นทางเหนือ tileset raster และ terrain */
export function MapPathOverlay() {
  const map = useAtomValue(mapInstanceAtom);
  const paths = useAtomValue(vehicleMapPathsAtom);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [, setTick] = useState(0);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return;

    const container = map.getContainer();
    const mount = document.createElement('div');
    mount.className = 'vehicle-path-overlay';

    const canvasContainer = container.querySelector('.mapboxgl-canvas-container');
    if (canvasContainer) {
      canvasContainer.appendChild(mount);
    } else {
      container.appendChild(mount);
    }
    hostRef.current = mount;
    setHost(mount);

    const repaint = () => setTick((n) => n + 1);
    map.on('move', repaint);
    map.on('zoom', repaint);
    map.on('rotate', repaint);
    map.on('pitch', repaint);
    map.on('resize', repaint);

    return () => {
      map.off('move', repaint);
      map.off('zoom', repaint);
      map.off('rotate', repaint);
      map.off('pitch', repaint);
      map.off('resize', repaint);
      mount.remove();
      hostRef.current = null;
      setHost(null);
    };
  }, [map]);

  if (!map || !host || paths.length === 0) return null;

  const { clientWidth: w, clientHeight: h } = map.getContainer();

  return createPortal(
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      style={{ display: 'block' }}
    >
      {paths.map((path) => {
        const d = coordsToSvgD(path.coords, map);
        if (!d) return null;
        const opacity = path.opacity ?? 1;
        const halo = path.width + 2;
        return (
          <g key={path.id}>
            <path
              d={d}
              fill="none"
              stroke="#ffffff"
              strokeWidth={halo}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={Math.min(opacity + 0.1, 1)}
            />
            <path
              d={d}
              fill="none"
              stroke={path.color}
              strokeWidth={path.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={path.dashed ? '10 6' : undefined}
              opacity={opacity}
            />
          </g>
        );
      })}
    </svg>,
    host,
  );
}
