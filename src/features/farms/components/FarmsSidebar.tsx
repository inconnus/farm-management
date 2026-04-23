import { useDevicesQuery } from '@features/devices/hooks/useDevicesQuery';
import {
  type CameraData,
  CameraMarker,
  FarmMarker,
  type LightData,
  LightMarker,
  PolygonMarker,
  type SolarCellData,
  SolarCellMarker,
  toCameraData,
  toLightData,
  toSolarCellData,
} from '@features/map/components';
import { MapPolygonDrawMount } from '@features/map/components/MapPolygonDrawMount';
import { TaskLabel } from '@features/map/components/TaskLabel';
import { devicePopupAtom } from '@features/map/store/devicePopupAtom';
import { useTasksQuery } from '@features/tasks/hooks/useTasksQuery';
import type { LandData } from '@shared/types/lands';
import { SidebarNav, type SidebarPage } from '@shared/ui/SidebarNav';
import { mapInstanceAtom } from '@store/mapStore';
import {
  clickedPolygonLandIdAtom,
  selectFarmAtom,
  selectLandAtom,
} from '@store/selectionStore';
import * as turf from '@turf/turf';
import { DEFAULT_MAP_OVERVIEW } from 'src/const/map';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import mapboxgl from 'mapbox-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFarmsQuery } from '../hooks/useFarmsQuery';
import { toFarm } from '../transforms';
import { FarmDetailPage } from './FarmDetailPage';
import { FarmListPage } from './FarmListPage';
import { LandDetailPage } from './LandDetailPage';
import { getCentroid } from 'src/utils/map';

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
    map.fitBounds([[w, s], [e, n]], {
      padding: { top: 60, bottom: 60, left: 60, right: 60 },
      duration: 1000,
      essential: true,
    });
  } else {
    map.flyTo({
      center: [farm.lng ?? 0, farm.lat ?? 0],
      zoom: 15,
      duration: 1000,
      essential: true,
    });
  }
}

function zoomToLand(map: mapboxgl.Map, coords: [number, number][]) {
  if (coords.length < 3) return;
  const bounds = new mapboxgl.LngLatBounds();
  for (const coord of coords) bounds.extend(coord);
  map.fitBounds(bounds, {
    padding: { top: 50, bottom: 50, left: 400, right: 400 },
    duration: 500,
    essential: true,
  });
}

function flyToOverview(map: mapboxgl.Map) {
  map.flyTo(DEFAULT_MAP_OVERVIEW);
}

// ─── Component ───────────────────────────────────────────────────

export const FarmsSidebar = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const mapInstance = useAtomValue(mapInstanceAtom);
  const selectFarm = useSetAtom(selectFarmAtom);
  const selectLand = useSetAtom(selectLandAtom);
  const setDevicePopup = useSetAtom(devicePopupAtom);
  const [clickedPolygonLandId, setClickedPolygonLandId] = useAtom(clickedPolygonLandIdAtom);
  const { farmId, orgSlug, landId } = useParams<{ farmId?: string; orgSlug?: string; landId?: string }>();

  // ─── Data ────────────────────────────────────────────────────

  const { data: dbDevices } = useDevicesQuery(farmId);
  const cameras = useMemo<CameraData[]>(
    () => dbDevices?.filter((d) => d.device_type === 'camera').map(toCameraData) ?? [],
    [dbDevices],
  );
  const solarCells = useMemo<SolarCellData[]>(
    () => dbDevices?.filter((d) => d.device_type === 'solar_cell').map(toSolarCellData) ?? [],
    [dbDevices],
  );
  const lights = useMemo<LightData[]>(
    () => dbDevices?.filter((d) => d.device_type === 'light').map(toLightData) ?? [],
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
        f.province.toLowerCase().includes(q) ||
        (f.district ?? '').toLowerCase().includes(q),
    );
  }, [searchText, farms]);

  // ─── Polygon lands state (persists across farm/land pages) ───

  const [lands, setLands] = useState<LandData[]>([]);
  const nextLandId = useRef(1);

  const selectedFarm = useMemo(() => farms.find((f) => f.id === farmId), [farms, farmId]);
  const selectedLandData = useMemo(
    () => selectedFarm?.lands.find((l) => l.id === landId),
    [selectedFarm, landId],
  );

  // Sync lands from server when farm changes
  useEffect(() => {
    setLands(selectedFarm?.lands ?? []);
  }, [selectedFarm]);

  // ─── Task counts for polygon labels ──────────────────────────

  const { data: dbTasks } = useTasksQuery(farmId);
  const taskCountByLand = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (!dbTasks) return map;
    for (const t of dbTasks) {
      if (!t.land_id || t.status === 'completed' || t.status === 'cancelled') continue;
      map.set(t.land_id, (map.get(t.land_id) ?? 0) + 1);
    }
    return map;
  }, [dbTasks]);

  // ─── Sync selection + map when opening via URL ───────────────

  useEffect(() => {
    if (selectedFarm) {
      selectFarm({ id: selectedFarm.id, name: selectedFarm.name, province: selectedFarm.province });
      if (mapInstance) {
        if (selectedLandData) {
          zoomToLand(mapInstance, selectedLandData.coords);
        } else {
          zoomToFarm(mapInstance, selectedFarm);
        }
      }
    } else {
      selectFarm(null);
      if (mapInstance) flyToOverview(mapInstance);
    }
  }, [selectedFarm, selectedLandData, mapInstance, selectFarm]);

  // Sync selectLand atom when landId URL param changes
  useEffect(() => {
    selectLand(selectedLandData ?? null);
  }, [selectedLandData, selectLand]);

  // ─── Handle polygon click on map → navigate to land ──────────

  const basePath = `/${orgSlug}/farms`;

  useEffect(() => {
    if (!clickedPolygonLandId || !farmId) return;
    const land = lands.find((l) => l.id === clickedPolygonLandId);
    if (land) {
      selectLand(land);
      if (mapInstance) zoomToLand(mapInstance, land.coords);
      navigate(`${basePath}/${farmId}/${land.id}`);
    }
    setClickedPolygonLandId(null);
  }, [clickedPolygonLandId, lands, farmId, selectLand, mapInstance, navigate, basePath, setClickedPolygonLandId]);

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
                selectFarm({ id: farm.id, name: farm.name, province: farm.province });
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
              nav={nav}
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
      {
        key: ':landId',
        path: ':landId',
        render: (nav) => {
          const farm = farms.find((f) => f.id === farmId);
          const land = farm?.lands.find((l) => l.id === landId);
          if (!farm || !land) return null;
          return (
            <LandDetailPage
              land={land}
              farmId={farm.id}
              farmName={farm.name}
              onBack={() => {
                selectLand(null);
                nav.pop();
              }}
            />
          );
        },
      },
    ],
    [filteredFarms, searchText, isLoading, farms, farmId, landId, mapInstance, selectFarm, selectLand],
  );

  // ─── Render ──────────────────────────────────────────────────

  return (
    <SidebarNav basePath={basePath} pages={pages}>
      {/* Polygon draw layer — persists across farm + land pages */}
      {farmId && (
        <>
          <MapPolygonDrawMount
            lands={lands}
            setLands={setLands}
            nextLandId={nextLandId}
            popupInfo={selectedLandData ? { land: selectedLandData } : null}
            onClearSelection={() => setDevicePopup(null)}
          />
          {lands.map((item) => (
            <PolygonMarker key={item.id} coords={item.coords}>
              <TaskLabel
                name={item.name}
                taskCount={taskCountByLand.get(item.id) ?? 0}
              />
            </PolygonMarker>
          ))}
        </>
      )}

      {!farmId && farms.map((farm) => {
        const { lat, lng } = getCentroid(farm);
        return (
          <FarmMarker
            key={farm.id}
            farm={{ id: farm.id, name: farm.name, image: farm.image, lands: farm.lands, lat, lng }}
            onClick={() => {
              if (farm) {
                selectFarm({ id: farm.id, name: farm.name, province: farm.province });
                if (mapInstance) zoomToFarm(mapInstance, farm);
              }
              navigate(`${basePath}/${farm.id}`);
            }}
          />
        );
      })}
      {farmId && cameras.map((c) => (
        <CameraMarker
          key={c.id}
          camera={c}
          onClick={(cam) => setDevicePopup({ type: 'camera', lngLat: [cam.lng, cam.lat], camera: cam })}
        />
      ))}
      {farmId && solarCells.map((sc) => (
        <SolarCellMarker
          key={sc.id}
          device={sc}
          onClick={(d) => setDevicePopup({ type: 'solar', lngLat: [d.lng, d.lat], solar: d })}
        />
      ))}
      {farmId && lights.map((l) => (
        <LightMarker
          key={l.id}
          light={l}
          onClick={(light) => setDevicePopup({ type: 'light', lngLat: [light.lng, light.lat], light })}
        />
      ))}
    </SidebarNav>
  );
};
