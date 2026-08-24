import { mapInstanceAtom } from '@store/mapStore';
import type { FeatureCollection, Point } from 'geojson';
import { useAtomValue } from 'jotai';
import type mapboxgl from 'mapbox-gl';
import { useEffect, useMemo, useRef } from 'react';

const SOURCE_ID = 'farms-overview';
const CLUSTER_LAYER_ID = 'farms-overview-clusters';
const CLUSTER_COUNT_LAYER_ID = 'farms-overview-cluster-count';
const POINT_LAYER_ID = 'farms-overview-unclustered';
const LABEL_LAYER_ID = 'farms-overview-label';

const LAYER_IDS = [
  LABEL_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  CLUSTER_LAYER_ID,
  POINT_LAYER_ID,
] as const;

export type FarmClusterPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

type FarmClustersMountProps = {
  points: FarmClusterPoint[];
  /** When false, layers are removed (e.g. while viewing a single farm). */
  visible: boolean;
  onFarmClick: (farmId: string) => void;
};

function isMapUsable(map: mapboxgl.Map | null | undefined): map is mapboxgl.Map {
  if (!map) return false;
  try {
    // After map.remove(), style is torn down and getLayer/getSource crash.
    return map.getStyle() != null;
  } catch {
    return false;
  }
}

function removeFarmLayers(map: mapboxgl.Map) {
  if (!isMapUsable(map)) return;
  try {
    for (const id of LAYER_IDS) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  } catch {
    // Map may be mid-destroy during logout / route change.
  }
}

function buildFeatureCollection(
  points: FarmClusterPoint[],
): FeatureCollection<Point> {
  const features: FeatureCollection<Point>['features'] = [];
  for (const p of points) {
    if (
      !Number.isFinite(p.lat) ||
      !Number.isFinite(p.lng) ||
      (p.lat === 0 && p.lng === 0)
    ) {
      continue;
    }
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { id: p.id, name: p.name },
    });
  }
  return { type: 'FeatureCollection', features };
}

function addFarmLayers(map: mapboxgl.Map) {
  if (map.getLayer(CLUSTER_LAYER_ID)) return;

  // Mapbox Standard styles hide custom layers unless a slot is set.
  const slot = 'top' as const;

  map.addLayer({
    id: CLUSTER_LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    slot,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#86efac',
        25,
        '#22c55e',
        100,
        '#15803d',
      ],
      'circle-radius': ['step', ['get', 'point_count'], 16, 25, 22, 100, 28],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.92,
    },
  });

  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: 'symbol',
    source: SOURCE_ID,
    slot,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-size': 12,
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': '#ffffff',
    },
  });

  map.addLayer({
    id: POINT_LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    slot,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#16a34a',
      'circle-radius': 7,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.95,
    },
  });

  map.addLayer({
    id: LABEL_LAYER_ID,
    type: 'symbol',
    source: SOURCE_ID,
    slot,
    filter: ['!', ['has', 'point_count']],
    minzoom: 10,
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 11,
      'text-offset': [0, 1.35],
      'text-anchor': 'top',
      'text-max-width': 10,
      'text-optional': true,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#111827',
      'text-halo-width': 1.25,
    },
  });
}

export function FarmClustersMount({
  points,
  visible,
  onFarmClick,
}: FarmClustersMountProps) {
  const map = useAtomValue(mapInstanceAtom);
  const onFarmClickRef = useRef(onFarmClick);
  onFarmClickRef.current = onFarmClick;

  const geojson = useMemo(() => buildFeatureCollection(points), [points]);
  const geojsonRef = useRef(geojson);
  geojsonRef.current = geojson;

  // Mount source/layers + interaction handlers; survive style switches.
  useEffect(() => {
    if (!isMapUsable(map)) return;

    const ensure = () => {
      if (!isMapUsable(map) || !map.isStyleLoaded()) return;

      if (!visible) {
        removeFarmLayers(map);
        return;
      }

      try {
        const existing = map.getSource(SOURCE_ID) as
          | mapboxgl.GeoJSONSource
          | undefined;
        if (existing) {
          existing.setData(geojsonRef.current);
          addFarmLayers(map);
          return;
        }

        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojsonRef.current,
          cluster: true,
          clusterMaxZoom: 12,
          clusterRadius: 50,
        });
        addFarmLayers(map);
      } catch (error) {
        console.warn('[FarmClustersMount] failed to add layers', error);
      }
    };

    const onClusterClick = (
      e: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.MapboxGeoJSONFeature[];
      },
    ) => {
      if (!isMapUsable(map)) return;
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== 'Point') return;

      const clusterId = feature.properties?.cluster_id;
      if (clusterId == null) return;

      const source = map.getSource(SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (!source) return;

      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null || !isMapUsable(map)) return;
        map.easeTo({
          center: feature.geometry.coordinates as [number, number],
          zoom,
          duration: 500,
        });
      });
    };

    const onPointClick = (
      e: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.MapboxGeoJSONFeature[];
      },
    ) => {
      const farmId = e.features?.[0]?.properties?.id;
      if (typeof farmId === 'string' && farmId) {
        onFarmClickRef.current(farmId);
      }
    };

    const setPointer = () => {
      if (!isMapUsable(map)) return;
      map.getCanvas().style.cursor = 'pointer';
    };
    const clearPointer = () => {
      if (!isMapUsable(map)) return;
      map.getCanvas().style.cursor = '';
    };

    ensure();
    map.on('style.load', ensure);
    map.on('load', ensure);
    map.once('idle', ensure);
    map.on('click', CLUSTER_LAYER_ID, onClusterClick);
    map.on('click', POINT_LAYER_ID, onPointClick);
    map.on('mouseenter', CLUSTER_LAYER_ID, setPointer);
    map.on('mouseleave', CLUSTER_LAYER_ID, clearPointer);
    map.on('mouseenter', POINT_LAYER_ID, setPointer);
    map.on('mouseleave', POINT_LAYER_ID, clearPointer);

    return () => {
      if (!isMapUsable(map)) return;
      try {
        map.off('style.load', ensure);
        map.off('load', ensure);
        map.off('click', CLUSTER_LAYER_ID, onClusterClick);
        map.off('click', POINT_LAYER_ID, onPointClick);
        map.off('mouseenter', CLUSTER_LAYER_ID, setPointer);
        map.off('mouseleave', CLUSTER_LAYER_ID, clearPointer);
        map.off('mouseenter', POINT_LAYER_ID, setPointer);
        map.off('mouseleave', POINT_LAYER_ID, clearPointer);
        removeFarmLayers(map);
      } catch {
        // Ignore teardown races on logout.
      }
    };
  }, [map, visible]);

  // Push data updates without remounting layers.
  useEffect(() => {
    if (!isMapUsable(map) || !visible) return;
    try {
      const source = map.getSource(SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (source) source.setData(geojson);
    } catch {
      // Map may already be destroyed.
    }
  }, [map, visible, geojson]);

  return null;
}
