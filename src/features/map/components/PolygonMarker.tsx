import { mapInstanceAtom } from '@store/mapStore';
import * as turf from '@turf/turf';
import { useAtomValue } from 'jotai';
import mapboxgl from 'mapbox-gl';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const getPolygonPixelSize = (
  map: mapboxgl.Map,
  coordinates: [number, number][],
) => {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const ring =
    coordinates[0][0] !== undefined && typeof coordinates[0][0] !== 'number'
      ? coordinates[0]
      : coordinates;

  ring.forEach((coord) => {
    const pixel = map.project(coord as [number, number]);
    if (pixel.x < minX) minX = pixel.x;
    if (pixel.y < minY) minY = pixel.y;
    if (pixel.x > maxX) maxX = pixel.x;
    if (pixel.y > maxY) maxY = pixel.y;
  });
  return { width: maxX - minX, height: maxY - minY };
};

export const PolygonMarker = ({
  coords,
  children,
}: {
  coords: [number, number][];
  children: React.ReactNode;
}) => {
  const map = useAtomValue(mapInstanceAtom);
  const [markerNode] = useState(() => document.createElement('div'));
  const contentRef = useRef<HTMLDivElement>(null);
  const sizeCache = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!map || !coords) return;
    const polygonGeoJSON = turf.polygon([coords]);
    const centroid = turf.centroid(polygonGeoJSON);
    const [lng, lat] = centroid.geometry.coordinates;
    const marker = new mapboxgl.Marker({
      element: markerNode,
      anchor: 'center',
    })
      .setLngLat([lng, lat])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, coords, markerNode]);

  useEffect(() => {
    if (!map || !coords) return;

    const checkVisibility = () => {
      if (contentRef.current) {
        sizeCache.current.width = contentRef.current.offsetWidth;
        sizeCache.current.height = contentRef.current.offsetHeight;
      }

      const labelWidth = sizeCache.current.width;
      const labelHeight = sizeCache.current.height;
      if (labelWidth === 0 || labelHeight === 0) return;

      const polySize = getPolygonPixelSize(map, coords);
      const safePadding = 10;

      if (
        polySize.width > labelWidth + safePadding &&
        polySize.height > labelHeight + safePadding
      ) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    checkVisibility();
    map.on('zoom', checkVisibility);
    return () => {
      map.off('zoom', checkVisibility);
    };
  }, [map, coords]);

  if (!isVisible) return null;

  return createPortal(
    <div
      ref={contentRef}
      style={{ display: 'inline-block', pointerEvents: 'none' }}
    >
      {children}
    </div>,
    markerNode,
  );
};
