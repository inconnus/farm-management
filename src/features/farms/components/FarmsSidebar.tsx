import { useDevicesQuery } from '@features/devices/hooks/useDevicesQuery';
import {
  type CameraData,
  CameraMarker,
  type SolarCellData,
  SolarCellMarker,
  toCameraData,
  toSolarCellData,
} from '@features/map/components';
import { devicePopupAtom } from '@features/map/store/devicePopupAtom';
import { SidebarNav, type SidebarPage } from '@shared/ui/SidebarNav';
import { mapInstanceAtom } from '@store/mapStore';
import { selectFarmAtom, selectLandAtom } from '@store/selectionStore';
import * as turf from '@turf/turf';
import { DEFAULT_MAP_OVERVIEW } from 'src/const/map';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFarmsQuery } from '../hooks/useFarmsQuery';
import { toFarm } from '../transforms';
import { FarmDetailPage } from './FarmDetailPage';
import { FarmListPage } from './FarmListPage';

// ─── Map helpers ─────────────────────────────────────────────────

function zoomToFarm(map: mapboxgl.Map, farm: ReturnType<typeof toFarm>) {
  const polygons = farm.lands
    .filter((l) => l.coords.length >= 3)
    .map((l) => {
      const ring = [...l.coords];
      const [first, last] = [ring[0], ring[ring.length - 1]];
      if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
      return turf.polygon([ring]);
    });
  if (polygons.length > 0) {
    const [w, s, e, n] = turf.bbox(turf.featureCollection(polygons));
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        duration: 1000,
        essential: true,
      },
    );
  }
}

function flyToOverview(map: mapboxgl.Map) {
  map.flyTo(DEFAULT_MAP_OVERVIEW);
}

// ─── Component ───────────────────────────────────────────────────

export const FarmsSidebar = () => {
  const [searchText, setSearchText] = useState('');
  const mapInstance = useAtomValue(mapInstanceAtom);
  const selectFarm = useSetAtom(selectFarmAtom);
  const selectLand = useSetAtom(selectLandAtom);
  const setDevicePopup = useSetAtom(devicePopupAtom);
  const { farmId } = useParams();

  // ─── Data ────────────────────────────────────────────────────

  const { data: dbDevices } = useDevicesQuery();
  const cameras = useMemo<CameraData[]>(
    () =>
      dbDevices?.filter((d) => d.device_type === 'camera').map(toCameraData) ??
      [],
    [dbDevices],
  );
  const solarCells = useMemo<SolarCellData[]>(
    () =>
      dbDevices
        ?.filter((d) => d.device_type === 'solar_cell')
        .map(toSolarCellData) ?? [],
    [dbDevices],
  );

  const { data: dbFarms = [], isLoading } = useFarmsQuery();
  const farms = useMemo(() => dbFarms.map(toFarm), [dbFarms]);

  const filteredFarms = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return farms;
    return farms.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.province.toLowerCase().includes(q),
    );
  }, [searchText, farms]);

  // ─── Sync selection + map when opening via URL ───────────────

  const selectedFarm = useMemo(
    () => farms.find((f) => f.id === farmId),
    [farms, farmId],
  );

  useEffect(() => {
    if (selectedFarm) {
      selectFarm({
        id: selectedFarm.id,
        name: selectedFarm.name,
        province: selectedFarm.province,
      });
      if (mapInstance) zoomToFarm(mapInstance, selectedFarm);
    } else {
      selectFarm(null);
      if (mapInstance) flyToOverview(mapInstance);
    }
  }, [selectedFarm, mapInstance, selectFarm]);

  // ─── Pages ───────────────────────────────────────────────────

  const pages: SidebarPage[] = useMemo(
    () => [
      {
        key: 'list',
        path: '',
        render: (nav) => (
          <FarmListPage
            farms={filteredFarms}
            searchText={searchText}
            onSearchChange={setSearchText}
            onSelectFarm={(id) => {
              const farm = farms.find((f) => f.id === id);
              if (farm) {
                selectFarm({
                  id: farm.id,
                  name: farm.name,
                  province: farm.province,
                });
                if (mapInstance) zoomToFarm(mapInstance, farm);
              }
              nav.push(id);
            }}
            isLoading={isLoading}
          />
        ),
      },
      {
        key: ':farmId',
        path: ':farmId',
        render: (nav) => {
          const farm = farms.find((f) => f.id === farmId);
          if (!farm) return null;
          return (
            <FarmDetailPage
              farm={farm}
              onBack={() => {
                selectLand(null);
                selectFarm(null);
                if (mapInstance) flyToOverview(mapInstance);
                nav.pop();
              }}
            />
          );
        },
      },
    ],
    [
      filteredFarms,
      searchText,
      isLoading,
      farms,
      farmId,
      mapInstance,
      selectFarm,
      selectLand,
    ],
  );

  // ─── Render ──────────────────────────────────────────────────

  return (
    <SidebarNav basePath="/farms" pages={pages}>
      {farmId &&
        cameras.map((c) => (
          <CameraMarker
            key={c.id}
            camera={c}
            onClick={(cam) =>
              setDevicePopup({
                type: 'camera',
                lngLat: [cam.lng, cam.lat],
                camera: cam,
              })
            }
          />
        ))}
      {farmId &&
        solarCells.map((sc) => (
          <SolarCellMarker
            key={sc.id}
            device={sc}
            onClick={(d) =>
              setDevicePopup({
                type: 'solar',
                lngLat: [d.lng, d.lat],
                solar: d,
              })
            }
          />
        ))}
    </SidebarNav>
  );
};
