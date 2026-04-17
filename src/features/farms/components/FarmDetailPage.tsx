import { Column, Row } from '@app/layout';
import { useTasksQuery } from '@features/tasks/hooks/useTasksQuery';
import {
  LandPopupContent,
  type LandPopupData,
  MapPopup,
  PolygonMarker,
} from '@features/map/components';
import { MapPolygonDrawMount } from '@features/map/components/MapPolygonDrawMount';
import { TaskLabel } from '@features/map/components/TaskLabel';
import { devicePopupAtom } from '@features/map/store/devicePopupAtom';
import type { LandData } from '@shared/types/lands';
import { mapInstanceAtom, isPolygonEditModeAtom } from '@store/mapStore';
import {
  clickedPolygonLandIdAtom,
  selectLandAtom,
  selectedLandAtom,
} from '@store/selectionStore';
import { Button, Chip, Separator, Tabs } from '@heroui/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  ChevronLeft,
  ChevronRight,
  SearchIcon,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Farm, Land } from '../transforms';
import { CreateLandModal } from './CreateLandModal';
import { useCreateLand } from '../hooks/useCreateLand';
import mapboxgl from 'mapbox-gl';

type Props = {
  farm: Farm;
  onBack: () => void;
};

export const FarmDetailPage = ({ farm, onBack }: Props) => {
  const mapInstance = useAtomValue(mapInstanceAtom);
  const isPolygonEditMode = useAtomValue(isPolygonEditModeAtom);
  const isPolygonEditModeRef = useRef(isPolygonEditMode);
  useEffect(() => {
    isPolygonEditModeRef.current = isPolygonEditMode;
  }, [isPolygonEditMode]);

  const selectLand = useSetAtom(selectLandAtom);
  const selectedLand = useAtomValue(selectedLandAtom);
  const [clickedPolygonLandId, setClickedPolygonLandId] = useAtom(clickedPolygonLandIdAtom);
  const setDevicePopup = useSetAtom(devicePopupAtom);

  // ─── Land state (initialized from farm.lands, updated by draw events) ───

  const [land, setLand] = useState<LandData[]>(farm.lands);
  const nextLandId = useRef(1);
  const [isCreateLandModalOpen, setIsCreateLandModalOpen] = useState(false);
  const { mutate: createLand, isPending: isCreatingLand, error: createLandError, reset: resetCreateLand } = useCreateLand(farm.id);

  useEffect(() => {
    setLand(farm.lands);
  }, [farm.lands]);

  // ─── Popup & view state ─────────────────────────────────────────────────

  const [popupInfo, setPopupInfo] = useState<{
    lngLat: [number, number];
    targetLngLat?: [number, number];
    land: LandPopupData;
  } | null>(null);

  const [previousViewState, setPreviousViewState] = useState<{
    center: mapboxgl.LngLat;
    zoom: number;
  } | null>(null);

  // ─── Task counts ─────────────────────────────────────────────────────────

  const { data: dbTasks } = useTasksQuery(farm.id);
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

  // ─── Selection logic ─────────────────────────────────────────────────────

  const applyLandSelection = useCallback(
    (landData: LandPopupData, mapInst: mapboxgl.Map) => {
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
            center: mapInst.getCenter(),
            zoom: mapInst.getZoom(),
          },
      );

      setPopupInfo({
        lngLat: [maxLng, bounds.getCenter().lat],
        targetLngLat: [maxLng, avgLat],
        land: landData,
      });
      selectLand(landData as Parameters<typeof selectLand>[0]);

      mapInst.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 400, right: 400 },
        duration: 500,
        essential: true,
      });
    },
    [selectLand],
  );

  // Restore view when popup is dismissed
  useEffect(() => {
    if (!popupInfo && previousViewState && mapInstance) {
      mapInstance.easeTo({
        center: previousViewState.center,
        zoom: previousViewState.zoom,
        duration: 500,
        essential: true,
      });
      setPreviousViewState(null);
    }
  }, [popupInfo, previousViewState, mapInstance]);

  // Clear popup when selection is cleared externally (e.g. background map click)
  useEffect(() => {
    if (!selectedLand) {
      setPopupInfo(null);
    }
  }, [selectedLand]);

  // React to polygon clicked on the map
  useEffect(() => {
    if (!clickedPolygonLandId || !mapInstance) return;
    const landData = land.find((l) => l.id === clickedPolygonLandId);
    if (landData) {
      applyLandSelection(landData, mapInstance);
    }
    setClickedPolygonLandId(null);
  }, [clickedPolygonLandId, mapInstance, land, applyLandSelection, setClickedPolygonLandId]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleLandClick = (landItem: Land) => {
    if (!mapInstance) return;
    applyLandSelection(landItem, mapInstance);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Polygon overlays — render null or map portals regardless of DOM position */}
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
      {land.map((item) => (
        <PolygonMarker key={item.id} coords={item.coords}>
          <TaskLabel
            name={item.name}
            taskCount={taskCountByLand.get(item.id) ?? 0}
          />
        </PolygonMarker>
      ))}
      {popupInfo && mapInstance && (
        <MapPopup
          map={mapInstance}
          lngLat={popupInfo.lngLat}
          targetLngLat={popupInfo.targetLngLat}
        >
          <LandPopupContent
            key={String(popupInfo.land.id)}
            land={popupInfo.land}
          />
        </MapPopup>
      )}

      <CreateLandModal
        isOpen={isCreateLandModalOpen}
        onOpenChange={(open) => {
          if (!open) resetCreateLand();
          setIsCreateLandModalOpen(open);
        }}
        farmCenter={farm.lat != null && farm.lng != null ? { lat: farm.lat, lng: farm.lng } : null}
        onSubmit={(data) => {
          createLand(
            {
              name: data.name,
              cropType: data.cropType,
              color: data.color,
              coords: data.coords,
            },
            { onSuccess: () => setIsCreateLandModalOpen(false) },
          );
        }}
        isSubmitting={isCreatingLand}
        error={createLandError ? (createLandError as Error).message : null}
      />

      {/* Sidebar content */}
      <Column className="flex flex-col p-3 max-h-[calc(90vh)] overflow-hidden">
        <div className="px-2 pt-1 pb-2">
          <Row className="items-center">
            <Button
              variant="ghost"
              size="sm"
              className="gap-0.5 text-[#007AFF] px-2"
              onPress={onBack}
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
              <span className="text-[15px]">ฟาร์ม</span>
            </Button>
            <span className="flex-1 text-center text-[17px] font-semibold text-gray-900 truncate px-2">
              {farm.name}
            </span>
            <div className="w-16 shrink-0" />
          </Row>
        </div>
        <Row className="items-center gap-2 bg-black/6 rounded-[10px] px-3 h-9">
          <SearchIcon size={14} className="text-gray-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            placeholder="ค้นหา"
          />
        </Row>
        <Separator className="my-2" />

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <Tabs className="w-full max-w-md flex-1 min-h-0 flex flex-col">
            <Tabs.ListContainer className="shrink-0">
              <Tabs.List aria-label="Options" className="bg-black/5">
                <Tabs.Tab id="overview">
                  แปลงที่ดิน
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="analytics">
                  อุปกรณ์
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="reports">
                  รายงาน
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="overview" className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable land list */}
              <Column className="flex-1 min-h-0 overflow-y-auto gap-1.5 camera-list-scroll">
                {farm.lands.map((landItem) => (
                  <Row
                    key={landItem.id}
                    onClick={() => handleLandClick(landItem)}
                    className="items-center rounded-xl p-2.5 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                  >
                    <div
                      className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                      style={{
                        background: `${landItem.color}22`,
                        border: `1.5px solid ${landItem.color}55`,
                      }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: landItem.color }}
                      />
                    </div>
                    <Column className="ml-2.5 min-w-0">
                      <span className="font-medium text-sm">{landItem.name}</span>
                      <Chip
                        className="w-fit mt-0.5"
                        style={{
                          background: `${landItem.color}22`,
                          color: landItem.color,
                        }}
                      >
                        <Chip.Label className="text-[11px]">
                          {landItem.type}
                        </Chip.Label>
                      </Chip>
                    </Column>
                    <ChevronRight
                      size={14}
                      className="text-gray-300 ml-auto shrink-0"
                    />
                  </Row>
                ))}
                {farm.lands.length === 0 && (
                  <span className="text-center text-gray-400 py-4 text-sm">
                    ยังไม่มีแปลงที่ดิน
                  </span>
                )}
              </Column>

              {/* Fixed button — always visible at bottom */}
              <div className="shrink-0 pt-2">
                <Button
                  className="w-full bg-[#03662c] text-white hover:bg-[#03662c]/80 border border-[#03662c]/30 font-bold tracking-wider uppercase text-xs"
                  onPress={() => setIsCreateLandModalOpen(true)}
                  size="lg"
                >
                  สร้างแปลงที่ดิน
                </Button>
              </div>
            </Tabs.Panel>
            <Tabs.Panel className="pt-4" id="analytics">
              <p>Track your metrics and analyze performance data.</p>
            </Tabs.Panel>
            <Tabs.Panel className="pt-4" id="reports">
              <p>Generate and download detailed reports.</p>
            </Tabs.Panel>
          </Tabs>
        </div>
      </Column>
    </>
  );
};
