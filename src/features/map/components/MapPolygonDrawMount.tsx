import MapboxDraw from '@mapbox/mapbox-gl-draw';
import {
  drawInstanceAtom,
  isPolygonEditModeAtom,
  mapInstanceAtom,
} from '@store/mapStore';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import { customDrawStyles } from '../draw-styles';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { LandData } from '@shared/types/lands';
import type { LandPopupData } from './index';

type MapPolygonDrawMountProps = {
  lands: LandData[];
  setLands: React.Dispatch<React.SetStateAction<LandData[]>>;
  nextLandId: React.MutableRefObject<number>;
  popupInfo: { land: LandPopupData } | null;
  onClearSelection: () => void;
};

const getDrawFeatureIdFromLand = (land: LandPopupData): string =>
  String(land.id);

const refreshDrawFeature = (draw: MapboxDraw, featureId: string) => {
  const f = draw.get(featureId);
  if (f) draw.add(f);
};

export function MapPolygonDrawMount({
  lands,
  setLands,
  nextLandId,
  popupInfo,
  onClearSelection,
}: MapPolygonDrawMountProps) {
  const map = useAtomValue(mapInstanceAtom);
  const setDrawInstance = useSetAtom(drawInstanceAtom);
  const isPolygonEditMode = useAtomValue(isPolygonEditModeAtom);

  const drawRef = useRef<MapboxDraw | null>(null);
  const highlightedFeatureIdRef = useRef<string | null>(null);

  const isPolygonEditModeRef = useRef(isPolygonEditMode);
  useEffect(() => {
    isPolygonEditModeRef.current = isPolygonEditMode;
  }, [isPolygonEditMode]);

  useEffect(() => {
    if (!map) return;
    if (drawRef.current) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      userProperties: true,
      controls: {},
      styles: customDrawStyles,
    });

    map.addControl(draw);
    drawRef.current = draw;
    setDrawInstance(draw);

    const onDrawCreate = (e: { features: GeoJSON.Feature[] }) => {
      if (e.features.length > 0) {
        const feature = e.features[0];
        const featureId = String(feature.id);
        draw.setFeatureProperty(featureId, 'color', '#ff0000');

        const newLand: LandData = {
          id: featureId,
          name: `แปลงใหม่ ${nextLandId.current++}`,
          type: 'ยังไม่ระบุ',
          location: '',
          image: '',
          color: '#ff0000',
          coords: (feature.geometry as GeoJSON.Polygon).coordinates[0] as [
            number,
            number,
          ][],
        };

        setLands((prev) => [...prev, newLand]);
        const updatedFeature = draw.get(featureId);
        if (updatedFeature) draw.add(updatedFeature);
      }
    };

    const onDrawUpdate = (e: { features: GeoJSON.Feature[] }) => {
      if (e.features.length > 0) {
        setLands((prev) => {
          const next = [...prev];
          for (const feature of e.features) {
            const featureId = String(feature.id);
            const idx = next.findIndex((item) => item.id === featureId);
            if (idx !== -1) {
              next[idx] = {
                ...next[idx],
                coords: (feature.geometry as GeoJSON.Polygon)
                  .coordinates[0] as [number, number][],
              };
            }
          }
          return next;
        });

        for (const f of e.features) {
          if (!f.properties?.color) {
            draw.setFeatureProperty(String(f.id), 'color', '#ff0000');
          }
        }
      }
    };

    const onDrawSelectionChange = (e: { features: GeoJSON.Feature[] }) => {
      if (e.features.length > 0) {
        if (!isPolygonEditModeRef.current) {
          draw.changeMode('simple_select', { featureIds: [] });
        }
      } else {
        onClearSelection();
      }
    };

    const onDrawDelete = (e: { features: GeoJSON.Feature[] }) => {
      if (e.features.length > 0) {
        const deletedIds = new Set(e.features.map((f) => String(f.id)));
        setLands((prev) => prev.filter((item) => !deletedIds.has(item.id)));
      }
    };

    const onMousedown = () => {
      if (!isPolygonEditModeRef.current && drawRef.current) {
        const selected = drawRef.current.getSelectedIds();
        if (selected.length > 0) {
          drawRef.current.changeMode('simple_select', { featureIds: [] });
        }
      }
    };

    map.on('draw.create', onDrawCreate);
    map.on('draw.update', onDrawUpdate);
    map.on('draw.selectionchange', onDrawSelectionChange);
    map.on('draw.delete', onDrawDelete);
    map.on('mousedown', onMousedown);

    // Initial lands — handled by the lands-sync effect below

    return () => {
      map.off('draw.create', onDrawCreate);
      map.off('draw.update', onDrawUpdate);
      map.off('draw.selectionchange', onDrawSelectionChange);
      map.off('draw.delete', onDrawDelete);
      map.off('mousedown', onMousedown);
      if (map.hasControl(draw)) {
        map.removeControl(draw);
      }
      setDrawInstance(null);
      drawRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Full sync lands ↔ draw whenever `lands` changes.
  // draw.add() both inserts new features AND updates existing ones (geometry + properties).
  // Also removes server-side lands that were deleted.
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;

    const serverIdSet = new Set(lands.map((l) => l.id));

    // Remove features whose server UUIDs are no longer in the lands list.
    // Use UUID pattern to avoid touching temporary MapboxDraw-generated IDs.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const f of draw.getAll().features) {
      const fid = String(f.id);
      if (UUID_RE.test(fid) && !serverIdSet.has(fid)) {
        draw.delete(fid);
      }
    }

    // Add or update every land (draw.add() is idempotent: same ID → replaces geometry/props).
    for (const l of lands) {
      if (l.coords.length < 3) continue;
      draw.add({
        id: l.id,
        type: 'Feature',
        properties: { color: l.color, landId: l.id },
        geometry: { type: 'Polygon', coordinates: [l.coords] },
      });
    }
  }, [lands]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;

    const prevId = highlightedFeatureIdRef.current;
    if (prevId) {
      const prevFeat = draw.get(prevId);
      if (prevFeat) {
        draw.setFeatureProperty(prevId, 'selected', 'false');
        refreshDrawFeature(draw, prevId);
      }
      highlightedFeatureIdRef.current = null;
    }

    if (!popupInfo) return;

    const fid = getDrawFeatureIdFromLand(popupInfo.land);
    const feat = draw.get(fid);
    if (!feat) return;

    draw.setFeatureProperty(fid, 'selected', 'true');
    refreshDrawFeature(draw, fid);
    highlightedFeatureIdRef.current = fid;
  }, [popupInfo]);

  return null;
}
