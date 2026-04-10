import mapboxgl from 'mapbox-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useLandsQuery } from '@features/farms/hooks/useLandsQuery';
import { toLandData } from '@features/farms/transforms';
import { useTasksQuery } from '@features/tasks/hooks/useTasksQuery';
import { Tabs } from '@heroui/react';
import type { LandData } from '@shared/types/lands';
import { isPolygonEditModeAtom, mapInstanceAtom } from '@store/mapStore';
import {
  selectedLandAtom,
  selectLandAtom,
  triggerSelectLandAtom,
} from '@store/selectionStore';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useTilesetsQuery } from '../hooks/useTilesetsQuery';
import { devicePopupAtom } from '../store/devicePopupAtom';
import { CameraPopup } from './CameraPopup';
import {
  LandPopupContent,
  type LandPopupData,
  MapPopup,
  PolygonMarker,
  WeatherWidget,
} from './index';
import { MapPolygonDrawMount } from './MapPolygonDrawMount';
import { MapStyleSwitcher } from './MapStyleSwitcher';
import { SolarCellPopup } from './SolarCellPopup';
import { TaskLabel } from './TaskLabel';

const ACCESS_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

const MapView = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>(null);
  const mapReadyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [devicePopup, setDevicePopup] = useAtom(devicePopupAtom);

  const [popupInfo, setPopupInfo] = useState<{
    lngLat: [number, number];
    targetLngLat?: [number, number];
    land: LandPopupData;
  } | null>(null);
  const setMapInstance = useSetAtom(mapInstanceAtom);
  const selectLand = useSetAtom(selectLandAtom);

  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const isPolygonEditMode = useAtomValue(isPolygonEditModeAtom);
  const isPolygonEditModeRef = useRef(isPolygonEditMode);
  const triggerSelectLand = useAtomValue(triggerSelectLandAtom);
  const setTriggerSelectLand = useSetAtom(triggerSelectLandAtom);

  const { data: dbLands } = useLandsQuery();
  const { data: dbTasks } = useTasksQuery();
  const { data: dbTilesets } = useTilesetsQuery();

  const taskCountByLand = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (!dbTasks) return map;
    for (const t of dbTasks) {
      if (!t.land_id || t.status === 'completed' || t.status === 'cancelled')
        continue;
      map.set(t.land_id, (map.get(t.land_id) ?? 0) + 1);
    }
    return map;
  }, [dbTasks]);
  const [land, setLand] = useState<LandData[]>([]);
  const landRef = useRef<LandData[]>([]);

  useEffect(() => {
    if (!dbLands) return;
    const mapped = dbLands.map((l) => toLandData(l));
    setLand(mapped);
  }, [dbLands]);

  useEffect(() => {
    landRef.current = land;
  }, [land]);

  const [previousViewState, setPreviousViewState] = useState<{
    center: mapboxgl.LngLat;
    zoom: number;
  } | null>(null);
  const nextLandId = useRef(1);

  useEffect(() => {
    isPolygonEditModeRef.current = isPolygonEditMode;
  }, [isPolygonEditMode]);

  const applyLandSelection = useCallback(
    (landData: LandPopupData, mapInstance: mapboxgl.Map) => {
      const bounds = new mapboxgl.LngLatBounds();
      landData.coords.forEach((coord: [number, number]) =>
        bounds.extend(coord),
      );

      const coords = landData.coords as [number, number][];
      const maxLng = Math.max(...coords.map((c) => c[0]));
      const pointsAtMaxLng = coords.filter((c) => c[0] === maxLng);
      const avgLat =
        pointsAtMaxLng.reduce((sum, p) => sum + p[1], 0) /
        pointsAtMaxLng.length;

      setPreviousViewState(
        (prev) =>
          prev || {
            center: mapInstance.getCenter(),
            zoom: mapInstance.getZoom(),
          },
      );

      setPopupInfo({
        lngLat: [maxLng, bounds.getCenter().lat],
        targetLngLat: [maxLng, avgLat],
        land: landData,
      });
      selectLand(landData as Parameters<typeof selectLand>[0]);

      mapInstance.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 400, right: 400 },
        duration: 500,
        essential: true,
      });
    },
    [selectLand],
  );

  const applyLandSelectionRef = useRef(applyLandSelection);
  useEffect(() => {
    applyLandSelectionRef.current = applyLandSelection;
  }, [applyLandSelection]);

  useEffect(() => {
    mapboxgl.accessToken = ACCESS_TOKEN;
    const m = new mapboxgl.Map({
      container: mapContainer.current!,
      center: { lat: 12.5352438, lng: 101.4918194 },
      zoom: 5,
      projection: 'mercator',
      style: 'mapbox://styles/mapbox/standard-satellite',
    });

    map.current = m;
    setMapInstance(m);

    m.on('load', async () => {
      m.addLayer({
        id: 'satellite-layer',
        type: 'raster',
        source: 'mapbox-satellite',
        minzoom: 1,
        maxzoom: 22,
      });
      m.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      m.setTerrain({
        source: 'mapbox-dem',
        exaggeration: 1.5,
        'exaggeration-transition': { duration: 1000 },
      });
      m.setFog(null);

      mapReadyRef.current = true;
      setMapReady(true);

      m.on('click', (e) => {
        if (isPolygonEditModeRef.current) return;

        if (activeTabRef.current !== 'overview') {
          setDevicePopup(null);
          return;
        }

        const features = m.queryRenderedFeatures(e.point);
        const feature = features?.find((f) =>
          f.layer?.id?.includes('gl-draw-polygon-fill'),
        );

        if (feature) {
          const landId = String(
            feature.properties?.landId ??
              feature.properties?.user_landId ??
              feature.id ??
              '',
          );
          const landData = landRef.current.find((l) => l.id === landId);
          if (landData) {
            applyLandSelectionRef.current(landData, m);
          }
        } else {
          setPopupInfo(null);
          setDevicePopup(null);
          selectLand(null);
        }
      });

      m.on('mouseenter', 'gl-draw-polygon-fill.cold', () => {
        if (!isPolygonEditModeRef.current)
          m.getCanvas().style.cursor = 'pointer';
      });
      m.on('mouseleave', 'gl-draw-polygon-fill.cold', () => {
        m.getCanvas().style.cursor = '';
      });
      m.on('mouseenter', 'gl-draw-polygon-fill.hot', () => {
        if (!isPolygonEditModeRef.current)
          m.getCanvas().style.cursor = 'pointer';
      });
      m.on('mouseleave', 'gl-draw-polygon-fill.hot', () => {
        m.getCanvas().style.cursor = '';
      });
    });

    return () => {
      mapReadyRef.current = false;
      setMapReady(false);
      addedTilesetIdsRef.current = new Set();
      setMapInstance(null);
      m.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addedTilesetIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady || !dbTilesets) return;

    const newIds = new Set(dbTilesets.map((t) => t.id));

    for (const oldId of addedTilesetIdsRef.current) {
      if (!newIds.has(oldId)) {
        if (m.getLayer(`tileset-${oldId}`)) m.removeLayer(`tileset-${oldId}`);
        if (m.getSource(`tileset-${oldId}`)) m.removeSource(`tileset-${oldId}`);
      }
    }

    for (const tileset of dbTilesets) {
      if (addedTilesetIdsRef.current.has(tileset.id)) continue;

      const sourceType =
        tileset.tileset_type === 'raster-dem' ? 'raster-dem' : 'raster';
      m.addSource(`tileset-${tileset.id}`, {
        type: sourceType,
        url: tileset.mapbox_url,
        tileSize: tileset.tile_size,
      });

      if (tileset.tileset_type !== 'raster-dem') {
        const firstDrawLayer = m
          .getStyle()
          .layers?.find((l) => l.id.startsWith('gl-draw-'))?.id;
        m.addLayer(
          {
            id: `tileset-${tileset.id}`,
            type: 'raster',
            source: `tileset-${tileset.id}`,
            paint: { 'raster-opacity': tileset.opacity },
            ...(tileset.min_zoom != null && { minzoom: tileset.min_zoom }),
            ...(tileset.max_zoom != null && { maxzoom: tileset.max_zoom }),
          },
          firstDrawLayer,
        );
      }
    }

    addedTilesetIdsRef.current = newIds;
  }, [dbTilesets, mapReady]);

  useEffect(() => {
    if (!popupInfo && previousViewState && map.current) {
      map.current.easeTo({
        center: previousViewState.center,
        zoom: previousViewState.zoom,
        duration: 500,
        essential: true,
      });
      setPreviousViewState(null);
    }
  }, [popupInfo, previousViewState]);

  const selectedLand = useAtomValue(selectedLandAtom);
  useEffect(() => {
    if (!selectedLand) {
      setPopupInfo(null);
    }
  }, [selectedLand]);

  useEffect(() => {
    if (!triggerSelectLand || !map.current) return;
    applyLandSelection(triggerSelectLand, map.current);
    setTriggerSelectLand(null);
  }, [triggerSelectLand, applyLandSelection, setTriggerSelectLand]);

  return (
    <>
      {mapReady && (
        <MapPolygonDrawMount
          lands={land}
          setLands={setLand}
          nextLandId={nextLandId}
          popupInfo={popupInfo}
          onClearSelection={() => {
            setPopupInfo(null);
            setDevicePopup(null);
          }}
        />
      )}
      <div id="map-container" ref={mapContainer} />
      {mapReady && <MapStyleSwitcher />}
      {land.map((item) => (
        <PolygonMarker key={item.id} coords={item.coords}>
          <TaskLabel
            name={item.name}
            taskCount={taskCountByLand.get(item.id) ?? 0}
          />
        </PolygonMarker>
      ))}

      {/* <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => {
          setActiveTab(String(key));
          setDevicePopup(null);
        }}
        className="max-w-md absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-transparent p-0"
      >
        <Tabs.ListContainer>
          <Tabs.List
            aria-label="Options"
            className="bg-transparent border border-gray-200/20 backdrop-blur-sm *:w-[110px]"
          >
            <Tabs.Tab id="overview" className="text-white">
              จัดการงาน
              <Tabs.Indicator className="bg-[#03662c]" />
            </Tabs.Tab>
            <Tabs.Tab id="analytics" className="text-white">
              อุปกรณ์
              <Tabs.Indicator className="bg-[#03662c]" />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs> */}
      {/* <WeatherWidget /> */}

      {popupInfo && map.current && (
        <MapPopup
          map={map.current}
          lngLat={popupInfo.lngLat}
          targetLngLat={popupInfo.targetLngLat}
        >
          <LandPopupContent
            key={String(popupInfo.land.id)}
            land={popupInfo.land}
          />
        </MapPopup>
      )}
      {devicePopup && map.current && (
        <MapPopup map={map.current} lngLat={devicePopup.lngLat}>
          {devicePopup.type === 'camera' && devicePopup.camera && (
            <CameraPopup camera={devicePopup.camera} />
          )}
          {devicePopup.type === 'solar' && devicePopup.solar && (
            <SolarCellPopup device={devicePopup.solar} />
          )}
        </MapPopup>
      )}
      <style>{`
        .draw-control-hidden .mapboxgl-ctrl-group:has(.mapbox-gl-draw_polygon) {
          display: none;
        }
      `}</style>
    </>
  );
};

export default MapView;
