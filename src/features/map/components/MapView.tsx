import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CameraGridView } from '@features/camera/components/CameraGridView';
import { authModeAtom } from '@features/auth/store';
import { isPolygonEditModeAtom, mapInstanceAtom, mapViewModeAtom } from '@store/mapStore';
import {
  clickedPolygonLandIdAtom,
  selectLandAtom,
} from '@store/selectionStore';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useTilesetsQuery } from '../hooks/useTilesetsQuery';
import { getTilesetBeforeId, movePathLayersToTop } from '../layerOrder';
import { devicePopupAtom } from '../store/devicePopupAtom';
import { CameraPopup } from './CameraPopup';
import { MapPopup } from './index';
import { LightPopup } from './LightPopup';
import { MapPathOverlay } from './MapPathOverlay';
import { MapStyleSwitcher } from './MapStyleSwitcher';
import { SensorPopup } from './SensorPopup';
import { SolarCellPopup } from './SolarCellPopup';
import { VehicleMapMarkerOverlay } from './VehicleMapMarkerOverlay';
import { VehiclePopup } from './VehiclePopup';
import { WaterLevelPopup } from './WaterLevelPopup';
import { MapViewModeSwitcher } from './MapViewModeSwitcher';

const ACCESS_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

const MapView = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>(null);
  const mapReadyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const [devicePopup, setDevicePopup] = useAtom(devicePopupAtom);
  const mapViewMode = useAtomValue(mapViewModeAtom);
  const authMode = useAtomValue(authModeAtom);
  const setMapViewMode = useSetAtom(mapViewModeAtom);
  const isPluksang = authMode === 'pluksang';
  const showCameraGrid = isPluksang && mapViewMode === 'camera-grid';

  const setMapInstance = useSetAtom(mapInstanceAtom);
  const selectLand = useSetAtom(selectLandAtom);
  const setClickedPolygonLandId = useSetAtom(clickedPolygonLandIdAtom);

  const isPolygonEditMode = useAtomValue(isPolygonEditModeAtom);
  const isPolygonEditModeRef = useRef(isPolygonEditMode);

  useEffect(() => {
    isPolygonEditModeRef.current = isPolygonEditMode;
  }, [isPolygonEditMode]);

  useEffect(() => {
    if (!isPluksang && mapViewMode !== 'map') {
      setMapViewMode('map');
    }
  }, [isPluksang, mapViewMode, setMapViewMode]);

  useEffect(() => {
    if (mapViewMode === 'camera-grid') {
      setDevicePopup(null);
      return;
    }
    const m = map.current;
    if (!m) return;
    const resize = () => m.resize();
    requestAnimationFrame(resize);
    window.setTimeout(resize, 100);
  }, [mapViewMode, setDevicePopup]);

  useEffect(() => {
    const el = mapContainer.current;
    const m = map.current;
    if (!el || !m || !mapReady) return;

    const observer = new ResizeObserver(() => {
      m.resize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mapReady]);

  const { data: dbTilesets } = useTilesetsQuery();

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
          if (landId) setClickedPolygonLandId(landId);
        } else {
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
        m.addLayer(
          {
            id: `tileset-${tileset.id}`,
            type: 'raster',
            source: `tileset-${tileset.id}`,
            slot: 'bottom',
            paint: { 'raster-opacity': tileset.opacity },
            ...(tileset.min_zoom != null && { minzoom: tileset.min_zoom }),
            ...(tileset.max_zoom != null && { maxzoom: tileset.max_zoom }),
          },
          getTilesetBeforeId(m),
        );
      }
    }

    movePathLayersToTop(m);

    addedTilesetIdsRef.current = newIds;
  }, [dbTilesets, mapReady]);

  return (
    <div className="relative flex flex-1 min-w-0 h-full overflow-hidden">
      <div className="relative flex-1 min-h-0 w-full h-full">
        <div
          id="map-container"
          ref={mapContainer}
          className={`absolute inset-0 h-full w-full ${showCameraGrid ? 'invisible' : ''}`}
        />
        {mapViewMode === 'map' && <MapPathOverlay />}
        {mapViewMode === 'map' && <VehicleMapMarkerOverlay />}
        {mapReady && mapViewMode === 'map' && <MapStyleSwitcher />}
        {showCameraGrid && <CameraGridView />}
        {isPluksang && <MapViewModeSwitcher />}
        {devicePopup && map.current && mapViewMode === 'map' && (
        <MapPopup
          map={map.current}
          lngLat={devicePopup.lngLat}
          followLivePosition={devicePopup.type === 'vehicle'}
        >
          {devicePopup.type === 'camera' && devicePopup.camera && (
            <CameraPopup camera={devicePopup.camera} />
          )}
          {devicePopup.type === 'solar' && devicePopup.solar && (
            <SolarCellPopup device={devicePopup.solar} />
          )}
          {devicePopup.type === 'light' && devicePopup.light && (
            <LightPopup
              light={devicePopup.light}
              onUpdate={(updated) =>
                setDevicePopup({
                  ...devicePopup,
                  light: { ...devicePopup.light, ...updated },
                })
              }
            />
          )}
          {devicePopup.type === 'sensor' && devicePopup.sensor && (
            <SensorPopup sensor={devicePopup.sensor} />
          )}
          {devicePopup.type === 'water_level' && devicePopup.waterLevel && (
            <WaterLevelPopup device={devicePopup.waterLevel} />
          )}
          {devicePopup.type === 'vehicle' && devicePopup.vehicle && (
            <VehiclePopup vehicle={devicePopup.vehicle} />
          )}
        </MapPopup>
        )}
      </div>
      <style>{`
        .draw-control-hidden .mapboxgl-ctrl-group:has(.mapbox-gl-draw_polygon) {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default MapView;
