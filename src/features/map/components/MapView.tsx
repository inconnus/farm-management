import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { isPolygonEditModeAtom, mapInstanceAtom } from '@store/mapStore';
import {
  clickedPolygonLandIdAtom,
  selectLandAtom,
} from '@store/selectionStore';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useTilesetsQuery } from '../hooks/useTilesetsQuery';
import { devicePopupAtom } from '../store/devicePopupAtom';
import { CameraPopup } from './CameraPopup';
import { MapPopup } from './index';
import { LightPopup } from './LightPopup';
import { MapStyleSwitcher } from './MapStyleSwitcher';
import { SolarCellPopup } from './SolarCellPopup';

const ACCESS_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

const MapView = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>(null);
  const mapReadyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const [devicePopup, setDevicePopup] = useAtom(devicePopupAtom);

  const setMapInstance = useSetAtom(mapInstanceAtom);
  const selectLand = useSetAtom(selectLandAtom);
  const setClickedPolygonLandId = useSetAtom(clickedPolygonLandIdAtom);

  const isPolygonEditMode = useAtomValue(isPolygonEditModeAtom);
  const isPolygonEditModeRef = useRef(isPolygonEditMode);

  useEffect(() => {
    isPolygonEditModeRef.current = isPolygonEditMode;
  }, [isPolygonEditMode]);

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

  return (
    <>
      <div id="map-container" ref={mapContainer} />
      {mapReady && <MapStyleSwitcher />}
      {devicePopup && map.current && (
        <MapPopup map={map.current} lngLat={devicePopup.lngLat}>
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
