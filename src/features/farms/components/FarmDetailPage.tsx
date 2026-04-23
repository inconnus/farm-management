import { Column, Row } from '@app/layout';
import {
  toCameraData,
  toLightData,
  toSolarCellData,
  type CameraData,
  type LightData,
  type SolarCellData,
} from '@features/map/components';
import { devicePopupAtom } from '@features/map/store/devicePopupAtom';
import { useDevicesQuery } from '@features/devices/hooks/useDevicesQuery';
import { mapInstanceAtom } from '@store/mapStore';
import { selectLandAtom } from '@store/selectionStore';
import type { SidebarNavAPI } from '@shared/ui/SidebarNav/types';
import { Button, Chip, Modal, Separator, Tabs } from '@heroui/react';
import { DropdownMenu } from '@shared/ui/DropdownMenu';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  Calendar,
  CctvIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Layers,
  Pencil,
  SearchIcon,
  SolarPanelIcon,
  SunIcon,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Farm } from '../transforms';
import { CreateLandModal, type LandInitialValues } from './CreateLandModal';
import { useCreateLand } from '../hooks/useCreateLand';
import { useTasksQuery, type DbTask } from '@features/tasks/hooks/useTasksQuery';
import { useDeleteTask, useUpdateTask } from '@features/tasks/hooks/useLandTasksQuery';
import { useDeleteLand, useUpdateLand } from '../hooks/useLandMutations';
import mapboxgl from 'mapbox-gl';

type Props = {
  farm: Farm;
  nav: SidebarNavAPI;
  onBack: () => void;
};

// ─── Land menu ───────────────────────────────────────────────────────────────

const LAND_MENU_ITEMS = [
  { id: 'edit', label: 'แก้ไขแปลง', icon: <Pencil size={13} /> },
  { id: 'delete', label: 'ลบแปลง', icon: <Trash2 size={13} />, variant: 'danger' as const },
];

type EditLandState = LandInitialValues & { id: string };

// ─── Summary helpers ──────────────────────────────────────────────────────────

const SUMMARY_TASK_MENU_ITEMS = [
  { id: 'edit', label: 'แก้ไข', icon: <Pencil size={13} /> },
  { id: 'delete', label: 'ลบ', icon: <Trash2 size={13} />, variant: 'danger' as const },
];

type SummaryFilterKey = 'all' | 'pending' | 'in_progress' | 'completed';

const SUMMARY_STATUS_META: Record<
  'pending' | 'in_progress' | 'completed',
  { label: string; dot: string; badge: string }
> = {
  pending:     { label: 'รอยืนยัน',        dot: 'bg-sky-400',     badge: 'bg-sky-50 text-sky-700' },
  in_progress: { label: 'กำลังดำเนินการ',  dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700' },
  completed:   { label: 'สำเร็จ',           dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
};

function formatTaskDueDate(dueDate: string | null): string | undefined {
  if (!dueDate) return undefined;
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dueDate));
}

// ─── FarmSummaryPanel ─────────────────────────────────────────────────────────

const FarmSummaryPanel = ({
  farm,
  cameras,
  solarCells,
  search,
  onEditTask,
  onDeleteTask,
}: {
  farm: Farm;
  cameras: CameraData[];
  solarCells: SolarCellData[];
  search: string;
  onEditTask: (task: DbTask) => void;
  onDeleteTask: (taskId: string) => void;
}) => {
  const { data: dbTasks, isLoading } = useTasksQuery(farm.id);

  const [filter, setFilter] = useState<SummaryFilterKey>('all');

  const tasks = useMemo<DbTask[]>(() => dbTasks ?? [], [dbTasks]);

  const counts = useMemo(() => ({
    all:         tasks.length,
    pending:     tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed:   tasks.filter((t) => t.status === 'completed').length,
  }), [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filter !== 'all') result = result.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q)
          || (t.description ?? '').toLowerCase().includes(q)
          || (t.land?.name ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [tasks, filter, search]);

  return (
    <Column className="flex-1 min-h-0 overflow-hidden flex flex-col gap-2 pt-1">

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 gap-2 px-1 shrink-0">
        <div className="rounded-xl bg-black/5 px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <Layers size={15} className="text-green-700" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{farm.lands.length}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">แปลงที่ดิน</p>
          </div>
        </div>
        <div className="rounded-xl bg-black/5 px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <ClipboardList size={15} className="text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{counts.all}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">งานทั้งหมด</p>
          </div>
        </div>
        <div className="rounded-xl bg-black/5 px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <CctvIcon size={15} className="text-gray-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{cameras.length}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">กล้อง</p>
          </div>
        </div>
        <div className="rounded-xl bg-black/5 px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <SolarPanelIcon size={15} className="text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{solarCells.length}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">โซลาร์เซลล์</p>
          </div>
        </div>
      </div>

      {/* ── Task status filters ── */}
      <div className="grid grid-cols-3 gap-1.5 px-1 shrink-0">
        {(['pending', 'in_progress', 'completed'] as const).map((s) => {
          const m = SUMMARY_STATUS_META[s];
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(active ? 'all' : s)}
              className={`flex flex-col items-center rounded-xl py-2 px-1 transition-colors cursor-pointer ${active ? 'bg-gray-900' : 'bg-black/5 hover:bg-black/8'}`}
            >
              <span className={`text-base font-bold leading-none ${active ? 'text-white' : 'text-gray-800'}`}>{counts[s]}</span>
              <span className={`text-[9px] mt-0.5 font-medium leading-tight text-center ${active ? 'text-white/80' : 'text-gray-500'}`}>{m.label}</span>
            </button>
          );
        })}
      </div>

      <Separator className="shrink-0" />

      {/* ── Task list ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">กำลังโหลดงาน…</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            {search ? 'ไม่พบงานที่ค้นหา' : 'ยังไม่มีงานในฟาร์มนี้'}
          </div>
        ) : (
          filteredTasks.map((task, i) => {
            const statusKey = task.status === 'pending' || task.status === 'in_progress' || task.status === 'completed'
              ? task.status
              : null;
            const meta = statusKey ? SUMMARY_STATUS_META[statusKey] : null;
            const dueLabel = formatTaskDueDate(task.due_date);
            const assigneeName = task.assignee?.full_name ?? 'ยังไม่มอบหมาย';
            const landName = task.land?.name;
            return (
              <div key={task.id}>
                <div className="rounded-xl px-3 py-2.5 hover:bg-black/5 transition-colors group">
                  <div className="flex items-start gap-2">
                    {meta && (
                      <span className={`mt-1 shrink-0 size-2 rounded-full block ${meta.dot}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-sm font-semibold text-gray-900 leading-snug block">{task.title}</span>
                        {landName && (
                          <span className="shrink-0 text-[10px] text-gray-400 bg-black/5 rounded-md px-1.5 py-0.5 ml-1 mt-0.5">{landName}</span>
                        )}
                      </div>
                      {task.description && (
                        <span className="text-xs text-gray-500 block mt-0.5 line-clamp-2">{task.description}</span>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        {meta && (
                          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${meta.badge}`}>
                            {meta.label}
                          </span>
                        )}
                        {dueLabel && (
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                            <Calendar size={9} />
                            {dueLabel}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                          <UserRound size={9} />
                          {assigneeName}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu
                        items={SUMMARY_TASK_MENU_ITEMS}
                        onAction={(action) => {
                          if (action === 'edit') onEditTask(task);
                          if (action === 'delete') onDeleteTask(task.id);
                        }}
                      />
                    </div>
                  </div>
                </div>
                {i < filteredTasks.length - 1 && <Separator className="my-0.5" />}
              </div>
            );
          })
        )}
      </div>
    </Column>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

function zoomToLandBounds(map: mapboxgl.Map, coords: [number, number][]) {
  if (coords.length < 3) return;
  const bounds = new mapboxgl.LngLatBounds();
  for (const coord of coords) bounds.extend(coord);
  map.fitBounds(bounds, {
    padding: { top: 50, bottom: 50, left: 400, right: 400 },
    duration: 500,
    essential: true,
  });
}

export const FarmDetailPage = ({ farm, nav, onBack }: Props) => {
  const mapInstance = useAtomValue(mapInstanceAtom);
  const selectLand = useSetAtom(selectLandAtom);
  const setDevicePopup = useSetAtom(devicePopupAtom);

  const [isCreateLandModalOpen, setIsCreateLandModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingTask, setEditingTask] = useState<DbTask | null>(null);
  const [editingLand, setEditingLand] = useState<EditLandState | null>(null);
  const { mutate: createLand, isPending: isCreatingLand, error: createLandError, reset: resetCreateLand } = useCreateLand(farm.id);
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const updateLand = useUpdateLand();
  const deleteLand = useDeleteLand();

  // ─── Tasks (for land task counts) ─────────────────────────────────────────

  const { data: dbTasks } = useTasksQuery(farm.id);

  const handleDeleteTask = useCallback((taskId: string) => {
    const task = dbTasks?.find((t) => t.id === taskId);
    if (!task?.land_id) return;
    deleteTask.mutate({ taskId, landId: task.land_id, farmId: farm.id });
  }, [deleteTask, dbTasks, farm.id]);

  const handleEditTaskSubmit = useCallback((data: { title: string; description?: string; dueDate?: string | null; assignedTo?: string | null }) => {
    if (!editingTask) return;
    updateTask.mutate(
      { input: { taskId: editingTask.id, title: data.title, description: data.description ?? null, dueDate: data.dueDate, assignedTo: data.assignedTo }, landId: editingTask.land_id ?? '', farmId: farm.id },
      { onSuccess: () => setEditingTask(null) },
    );
  }, [updateTask, editingTask, farm.id]);
  const taskCountByLand = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of dbTasks ?? []) {
      if (t.land_id) map[t.land_id] = (map[t.land_id] ?? 0) + 1;
    }
    return map;
  }, [dbTasks]);

  // ─── Devices ──────────────────────────────────────────────────────────────

  const { data: dbDevices } = useDevicesQuery(farm.id);
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

  // ─── Search filtering ─────────────────────────────────────────────────────

  const filteredLands = useMemo(() => {
    if (!search.trim()) return farm.lands;
    const q = search.trim().toLowerCase();
    return farm.lands.filter(
      (l) => l.name.toLowerCase().includes(q) || (l.type ?? '').toLowerCase().includes(q),
    );
  }, [farm.lands, search]);

  const filteredCameras = useMemo(() => {
    if (!search.trim()) return cameras;
    const q = search.trim().toLowerCase();
    return cameras.filter((c) => c.name.toLowerCase().includes(q));
  }, [cameras, search]);

  const filteredSolarCells = useMemo(() => {
    if (!search.trim()) return solarCells;
    const q = search.trim().toLowerCase();
    return solarCells.filter((s) => s.name.toLowerCase().includes(q));
  }, [solarCells, search]);

  const filteredLights = useMemo(() => {
    if (!search.trim()) return lights;
    const q = search.trim().toLowerCase();
    return lights.filter((l) => l.name.toLowerCase().includes(q));
  }, [lights, search]);

  // ─── Land navigation ──────────────────────────────────────────────────────

  const navigateToLand = useCallback(
    (landId: string, coords: [number, number][], landData: Farm['lands'][number]) => {
      selectLand(landData);
      if (mapInstance) zoomToLandBounds(mapInstance, coords);
      nav.push(landId);
    },
    [selectLand, mapInstance, nav],
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
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
      <Row className="items-center gap-2 bg-black/6 rounded-[10px] px-3 h-9 shrink-0">
        <SearchIcon size={14} className="text-gray-400 shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          placeholder="ค้นหางาน หรือ แปลง..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Row>
      <Separator className="my-2" />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Tabs className="w-full max-w-md flex-1 min-h-0 flex flex-col">
          <Tabs.ListContainer className="shrink-0">
            <Tabs.List aria-label="Options" className="bg-black/5">
              <Tabs.Tab id="summary">
                ภาพรวมฟาร์ม
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="overview">
                แปลงที่ดิน
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="analytics">
                อุปกรณ์
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="overview" className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
            <Column className="flex-1 min-h-0 overflow-y-auto gap-1.5 camera-list-scroll">
              {filteredLands.map((landItem) => (
                <div key={landItem.id} className="group flex items-center rounded-xl hover:bg-black/5 transition-colors shrink-0">
                  <button
                    type="button"
                    className="flex items-center gap-0 flex-1 min-w-0 p-2.5 text-left cursor-pointer"
                    onClick={() => navigateToLand(landItem.id, landItem.coords, landItem)}
                  >
                    <div
                      className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                      style={{ background: `${landItem.color}22`, border: `1.5px solid ${landItem.color}55` }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: landItem.color }} />
                    </div>
                    <Column className="ml-2.5 min-w-0">
                      <span className="font-medium text-sm">{landItem.name}</span>
                      <Chip className="w-fit mt-0.5" style={{ background: `${landItem.color}22`, color: landItem.color }}>
                        <Chip.Label className="text-[11px]">{landItem.type}</Chip.Label>
                      </Chip>
                    </Column>
                    <div className="ml-auto flex items-center gap-2 shrink-0 pr-1">
                      {(taskCountByLand[landItem.id] ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-black/5 rounded-full px-2 py-0.5">
                          <ClipboardList size={10} />
                          {taskCountByLand[landItem.id]}
                        </span>
                      )}
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </button>
                  <div
                    className="shrink-0 pr-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu
                      items={LAND_MENU_ITEMS}
                      onAction={(action) => {
                        if (action === 'edit') {
                          setEditingLand({ id: landItem.id, name: landItem.name, cropType: landItem.type ?? '', color: landItem.color ?? '#22c55e', coords: landItem.coords });
                        }
                        if (action === 'delete') {
                          deleteLand.mutate(landItem.id);
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
              {filteredLands.length === 0 && (
                <span className="text-center text-gray-400 py-4 text-sm">
                  {search.trim() ? 'ไม่พบแปลงที่ดินที่ค้นหา' : 'ยังไม่มีแปลงที่ดิน'}
                </span>
              )}
            </Column>

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
          <Tabs.Panel id="analytics" className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
            <Column className="flex-1 min-h-0 overflow-y-auto gap-1 camera-list-scroll">
              {filteredCameras.map((cam) => (
                <Row
                  key={cam.id}
                  onClick={() => {
                    if (mapInstance) mapInstance.flyTo({ center: [cam.lng, cam.lat], zoom: 17, duration: 800 });
                    setDevicePopup({ type: 'camera', lngLat: [cam.lng, cam.lat], camera: cam });
                  }}
                  className="items-center rounded-xl p-2.5 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                >
                  <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-gray-100 border border-gray-200 relative">
                    <CctvIcon size={16} className="text-gray-600" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-white" />
                  </div>
                  <Column className="ml-2.5 min-w-0">
                    <span className="font-medium text-sm truncate">{cam.name}</span>
                    <Chip className="w-fit mt-0.5 bg-gray-100">
                      <Chip.Label className="text-[11px] text-gray-500">กล้อง</Chip.Label>
                    </Chip>
                  </Column>
                  <ChevronRight size={14} className="text-gray-300 ml-auto shrink-0" />
                </Row>
              ))}

              {filteredSolarCells.map((sc) => (
                <Row
                  key={sc.id}
                  onClick={() => {
                    if (mapInstance) mapInstance.flyTo({ center: [sc.lng, sc.lat], zoom: 17, duration: 800 });
                    setDevicePopup({ type: 'solar', lngLat: [sc.lng, sc.lat], solar: sc });
                  }}
                  className="items-center rounded-xl p-2.5 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                >
                  <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-amber-50 border border-amber-200">
                    <SolarPanelIcon size={16} className="text-amber-600" />
                  </div>
                  <Column className="ml-2.5 min-w-0">
                    <span className="font-medium text-sm truncate">{sc.name}</span>
                    <Chip className="w-fit mt-0.5 bg-amber-50">
                      <Chip.Label className="text-[11px] text-amber-600">
                        โซลาร์เซลล์ · {sc.capacityKw} kW
                      </Chip.Label>
                    </Chip>
                  </Column>
                  <ChevronRight size={14} className="text-gray-300 ml-auto shrink-0" />
                </Row>
              ))}

              {filteredLights.map((light) => (
                <Row
                  key={light.id}
                  onClick={() => {
                    if (mapInstance) mapInstance.flyTo({ center: [light.lng, light.lat], zoom: 17, duration: 800 });
                    setDevicePopup({ type: 'light', lngLat: [light.lng, light.lat], light });
                  }}
                  className="items-center rounded-xl p-2.5 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                >
                  <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-yellow-50 border border-yellow-200 relative">
                    <SunIcon size={16} className={light.isOn ? 'text-yellow-600' : 'text-yellow-700/50'} />
                    {light.isOn && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400 border border-white" />
                    )}
                  </div>
                  <Column className="ml-2.5 min-w-0">
                    <span className="font-medium text-sm truncate">{light.name}</span>
                    <Chip className="w-fit mt-0.5 bg-yellow-50">
                      <Chip.Label className="text-[11px] text-yellow-800">
                        หลอดไฟ · {light.isOn ? 'เปิด' : 'ปิด'} · {light.brightness}%
                      </Chip.Label>
                    </Chip>
                  </Column>
                  <ChevronRight size={14} className="text-gray-300 ml-auto shrink-0" />
                </Row>
              ))}

              {filteredCameras.length === 0 && filteredSolarCells.length === 0 && filteredLights.length === 0 && (
                <span className="text-center text-gray-400 py-4 text-sm">
                  {search.trim() ? 'ไม่พบอุปกรณ์ที่ค้นหา' : 'ยังไม่มีอุปกรณ์'}
                </span>
              )}
            </Column>
          </Tabs.Panel>
          <Tabs.Panel id="summary" className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden pt-2">
            <FarmSummaryPanel
              farm={farm}
              cameras={cameras}
              solarCells={solarCells}
              search={search}
              onEditTask={(task) => setEditingTask(task)}
              onDeleteTask={handleDeleteTask}
            />
          </Tabs.Panel>
        </Tabs>
      </div>

      {/* Create land */}
      <CreateLandModal
        isOpen={isCreateLandModalOpen}
        onOpenChange={(open) => {
          if (!open) resetCreateLand();
          setIsCreateLandModalOpen(open);
        }}
        farmCenter={farm.lat != null && farm.lng != null ? { lat: farm.lat, lng: farm.lng } : null}
        onSubmit={(data) => {
          createLand(
            { name: data.name, cropType: data.cropType, color: data.color, coords: data.coords },
            { onSuccess: () => setIsCreateLandModalOpen(false) },
          );
        }}
        isSubmitting={isCreatingLand}
        error={createLandError ? (createLandError as Error).message : null}
      />

      {/* Edit land */}
      <CreateLandModal
        isOpen={!!editingLand}
        onOpenChange={(open) => { if (!open) setEditingLand(null); }}
        initialValues={editingLand ?? undefined}
        onSubmit={(data) => {
          if (!editingLand) return;
          updateLand.mutate(
            {
              landId: editingLand.id,
              input: {
                name: data.name,
                cropType: data.cropType || null,
                color: data.color,
                ...(data.coords.length > 0 && { coords: data.coords }),
              },
            },
            { onSuccess: () => setEditingLand(null) },
          );
        }}
        isSubmitting={updateLand.isPending}
      />

      <FarmEditTaskModal
        task={editingTask}
        isPending={updateTask.isPending}
        onClose={() => setEditingTask(null)}
        onSubmit={handleEditTaskSubmit}
      />
    </Column>
  );
};

// ─── FarmEditTaskModal ────────────────────────────────────────────────────────

function FarmEditTaskModal({
  task,
  isPending,
  onClose,
  onSubmit,
}: {
  task: DbTask | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description?: string; dueDate?: string | null; assignedTo?: string | null }) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [dueDate, setDueDate] = useState(task?.due_date ?? '');
  const [titleError, setTitleError] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setDueDate(task.due_date ?? '');
    setTitleError(false);
  }, [task]);

  const handleSubmit = () => {
    const t = title.trim();
    if (!t) { setTitleError(true); return; }
    setTitleError(false);
    onSubmit({ title: t, description: description.trim() || undefined, dueDate: dueDate || null });
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={!!task} onOpenChange={(open) => { if (!open) onClose(); }}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg bg-white text-gray-800 border border-gray-200 shadow-2xl">
            <Modal.CloseTrigger className="hover:bg-gray-100" />
            <Modal.Header className="border-b border-gray-100">
              <Modal.Heading className="font-bold text-gray-800">แก้ไขงาน</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  ชื่องาน <span className="text-red-500">*</span>
                </label>
                <input
                  className={`h-10 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-[#03662c]/30 ${titleError ? 'border-red-300' : 'border-gray-200'}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {titleError && <span className="text-xs text-red-600">กรุณากรอกชื่องาน</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">รายละเอียด</label>
                <textarea
                  className="min-h-[88px] w-full resize-y rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#03662c]/30"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">กำหนดเสร็จ</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#03662c]/30"
                />
              </div>
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2 border-t border-gray-100 pt-3">
              <Button variant="ghost" className="font-semibold text-gray-700" onPress={onClose} isDisabled={isPending}>
                ยกเลิก
              </Button>
              <Button className="bg-[#03662c] text-white hover:bg-[#03662c]/80 font-semibold" onPress={handleSubmit} isDisabled={isPending}>
                {isPending ? 'กำลังบันทึก…' : 'บันทึก'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
