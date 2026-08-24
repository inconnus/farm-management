import { mapInstanceAtom } from '@store/mapStore';
import type { Feature, LineString } from 'geojson';
import { useAtomValue } from 'jotai';
import type mapboxgl from 'mapbox-gl';
import { useEffect, useMemo } from 'react';
import { movePathLayersToTop } from '../layerOrder';

type MapPathMountProps = {
  id: string;
  coords: [number, number][];
  color?: string;
  width?: number;
  dashed?: boolean;
  opacity?: number;
};

export function MapPathMount({
  id,
  coords,
  color = '#22c55e',
  width = 3,
  dashed = false,
  opacity = 0.9,
}: MapPathMountProps) {
  const map = useAtomValue(mapInstanceAtom);
  const coordsKey = useMemo(() => JSON.stringify(coords), [coords]);

  useEffect(() => {
    if (!map || coords.length < 2) return;

    const sourceId = `path-source-${id}`;
    const layerId = `path-layer-${id}`;
    const outlineId = `path-outline-${id}`;

    const geojson: Feature<LineString> = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coords },
    };

    const upsert = () => {
      const existing = map.getSource(sourceId);
      if (existing) {
        (existing as mapboxgl.GeoJSONSource).setData(geojson);
        movePathLayersToTop(map);
        return;
      }

      map.addSource(sourceId, { type: 'geojson', data: geojson });

      map.addLayer({
        id: outlineId,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': width + 3,
          'line-opacity': 0.75,
        },
      });

      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': color,
          'line-width': width,
          'line-opacity': opacity,
          ...(dashed ? { 'line-dasharray': [2, 1.5] as [number, number] } : {}),
        },
      });

      movePathLayersToTop(map);
    };

    if (map.isStyleLoaded()) {
      upsert();
    } else {
      map.once('load', upsert);
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getLayer(outlineId)) map.removeLayer(outlineId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, id, coordsKey, color, width, dashed, opacity, coords.length]);

  return null;
}
