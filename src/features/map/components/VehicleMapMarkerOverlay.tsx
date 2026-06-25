import { devicePopupAtom, type DevicePopupState } from '@features/map/store/devicePopupAtom';
import { vehiclePopupLiveLngLatRef } from '@features/map/store/vehiclePopupLivePositionRef';
import { vehicleMapMarkersAtom } from '@features/map/store/vehicleMapLayerAtom';
import { vehicleMapPathsAtom } from '@features/map/store/vehicleMapPathsAtom';
import type { VehicleData } from '@features/vehicles/types';
import { mapInstanceAtom } from '@store/mapStore';
import type mapboxgl from 'mapbox-gl';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { buildVehicleMapPaths, useVehiclePathAnimation } from '../hooks/useVehiclePathAnimation';
import { VehicleMarkerFace } from './VehicleMarker';

const VEHICLE_POPUP_SYNC_MS = 1000;
const VEHICLE_POPUP_PROGRESS_STEP = 0.005;

function syncVehiclePopup(
  animated: VehicleData[],
  devicePopup: DevicePopupState,
  setDevicePopup: (value: DevicePopupState) => void,
  lastSyncRef: MutableRefObject<{ vehicle: VehicleData; at: number } | null>,
) {
  if (devicePopup?.type !== 'vehicle') return;

  const live = animated.find((v) => v.id === devicePopup.vehicle.id);
  if (!live) return;

  vehiclePopupLiveLngLatRef.current = [live.lng, live.lat];

  const last = lastSyncRef.current;
  const progressDelta = Math.abs(live.pathProgress - (last?.vehicle.pathProgress ?? -1));
  const statusChanged = live.jobStatus !== last?.vehicle.jobStatus;
  const elapsed = Date.now() - (last?.at ?? 0);

  if (
    !last ||
    statusChanged ||
    progressDelta >= VEHICLE_POPUP_PROGRESS_STEP ||
    elapsed >= VEHICLE_POPUP_SYNC_MS
  ) {
    lastSyncRef.current = { vehicle: live, at: Date.now() };
    setDevicePopup({
      type: 'vehicle',
      lngLat: [live.lng, live.lat],
      vehicle: live,
    });
  }
}

function projectMarkerTransform(map: mapboxgl.Map, lng: number, lat: number): string {
  const { x, y } = map.project([lng, lat]);
  return `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -100%)`;
}

/**
 * Marker รถไถแบบ DOM overlay — อยู่ layer เดียวกับ path แต่ z-index สูงกว่า
 */
export function VehicleMapMarkerOverlay() {
  const map = useAtomValue(mapInstanceAtom);
  const baseVehicles = useAtomValue(vehicleMapMarkersAtom);
  const setVehicleMapPaths = useSetAtom(vehicleMapPathsAtom);
  const setDevicePopup = useSetAtom(devicePopupAtom);
  const devicePopup = useAtomValue(devicePopupAtom);
  const devicePopupRef = useRef(devicePopup);
  devicePopupRef.current = devicePopup;
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const markerRefs = useRef(new Map<string, HTMLDivElement>());
  const animatedRef = useRef<VehicleData[]>([]);
  const lastPopupSyncRef = useRef<{ vehicle: VehicleData; at: number } | null>(null);

  const repaintMarkers = useCallback(() => {
    if (!map) return;
    for (const vehicle of animatedRef.current) {
      const el = markerRefs.current.get(vehicle.id);
      if (el) {
        el.style.transform = projectMarkerTransform(map, vehicle.lng, vehicle.lat);
      }
    }
  }, [map]);

  const handleAnimationFrame = useCallback(
    (animated: VehicleData[]) => {
      animatedRef.current = animated;

      if (animated.length === 0) {
        setVehicleMapPaths([]);
        return;
      }

      repaintMarkers();
      setVehicleMapPaths(buildVehicleMapPaths(animated));
      syncVehiclePopup(animated, devicePopupRef.current, setDevicePopup, lastPopupSyncRef);
    },
    [repaintMarkers, setVehicleMapPaths, setDevicePopup],
  );

  useVehiclePathAnimation(baseVehicles, handleAnimationFrame);

  useEffect(() => {
    if (!map) return;

    const container = map.getContainer();
    const canvasContainer = container.querySelector('.mapboxgl-canvas-container');

    const mount = document.createElement('div');
    mount.className = 'vehicle-marker-overlay';

    if (canvasContainer) {
      canvasContainer.appendChild(mount);
      const pathLayer = canvasContainer.querySelector('.vehicle-path-overlay');
      if (pathLayer) {
        canvasContainer.appendChild(pathLayer);
        canvasContainer.appendChild(mount);
      }
    } else {
      container.appendChild(mount);
    }
    hostRef.current = mount;
    setHost(mount);

    map.on('move', repaintMarkers);
    map.on('zoom', repaintMarkers);
    map.on('rotate', repaintMarkers);
    map.on('pitch', repaintMarkers);
    map.on('resize', repaintMarkers);

    return () => {
      map.off('move', repaintMarkers);
      map.off('zoom', repaintMarkers);
      map.off('rotate', repaintMarkers);
      map.off('pitch', repaintMarkers);
      map.off('resize', repaintMarkers);
      mount.remove();
      hostRef.current = null;
      setHost(null);
      markerRefs.current.clear();
    };
  }, [map, repaintMarkers]);

  useEffect(() => {
    if (!map || baseVehicles.length === 0) return;
    repaintMarkers();
  }, [map, baseVehicles, repaintMarkers]);

  if (!map || !host || baseVehicles.length === 0) return null;

  const handleSelect = (vehicle: VehicleData) => {
    const latest =
      animatedRef.current.find((v) => v.id === vehicle.id) ?? vehicle;
    vehiclePopupLiveLngLatRef.current = [latest.lng, latest.lat];
    lastPopupSyncRef.current = { vehicle: latest, at: Date.now() };
    setDevicePopup({ type: 'vehicle', lngLat: [latest.lng, latest.lat], vehicle: latest });
  };

  return createPortal(
    <>
      {baseVehicles.map((vehicle) => (
        <div
          key={vehicle.id}
          ref={(el) => {
            if (el) markerRefs.current.set(vehicle.id, el);
            else markerRefs.current.delete(vehicle.id);
          }}
          className="vehicle-marker-overlay-item"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            willChange: 'transform',
            transform: projectMarkerTransform(map, vehicle.lng, vehicle.lat),
          }}
        >
          <VehicleMarkerFace item={vehicle} onClick={handleSelect} />
        </div>
      ))}
    </>,
    host,
  );
}
