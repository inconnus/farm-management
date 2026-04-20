import { Column, Row } from '@app/layout';
import type { FarmMembersData, FarmTeam } from '@features/farms/hooks/useFarmMembersQuery';
import { useOrgMembersWithFarmTeamsQuery } from '@features/farms/hooks/useFarmMembersQuery';
import type { LandPopupData, LandTask, TaskStatus } from '@features/map/types';
import {
  advanceDbStatus,
  useCreateTask,
  useDeleteTask,
  useLandTasksQuery,
  useUpdateTask,
  useUpdateTaskStatus,
} from '@features/tasks/hooks/useLandTasksQuery';
import { Button, Calendar, DateField, DatePicker, Modal, Separator } from '@heroui/react';
import { parseDate } from '@internationalized/date';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ClipboardList,
  Pencil,
  Plus,
  SearchIcon,
  Trash2,
  UserRound,
} from 'lucide-react';
import { currentOrgIdAtom } from '@shared/store/orgStore';
import { DropdownMenu } from '@shared/ui/DropdownMenu';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

function buildPolygonMapUrl(coords: [number, number][], color = '#22c55e'): string | null {
  if (coords.length < 3) return null;
  const ring = [...coords];
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]);
  const geojson = {
    type: 'Feature',
    properties: { stroke: color, 'stroke-width': 2, 'stroke-opacity': 0.9, fill: color, 'fill-opacity': 0.25 },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/geojson(${encodeURIComponent(JSON.stringify(geojson))})/auto/360x160@2x?access_token=${MAPBOX_TOKEN}&padding=60&attribution=false&logo=false`;
}

function dbStatusToUi(status: string): TaskStatus | null {
  if (status === 'pending') return 'pending_confirmation';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'completed') return 'done';
  return null;
}

function formatDueDate(dueDate: string | null): string | undefined {
  if (!dueDate) return undefined;
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dueDate));
}

const memberName = (membersData: FarmMembersData | undefined, assigneeId: string | null): string => {
  if (!assigneeId) return 'ยังไม่มอบหมาย';
  return membersData?.allMembers.find((m) => m.id === assigneeId)?.name ?? 'ไม่ระบุ';
};

const STATUS_META: Record<TaskStatus, { label: string; dot: string; badge: string }> = {
  pending_confirmation: { label: 'รอยืนยัน',      dot: 'bg-sky-400',     badge: 'bg-sky-50 text-sky-700' },
  in_progress:         { label: 'กำลังดำเนินการ', dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700' },
  done:                { label: 'สำเร็จ',          dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
};

type FilterKey = 'all' | TaskStatus;

// ─── Assignee selection type ──────────────────────────────────────────────────

type AssigneeSelection =
  | { kind: 'none' }
  | { kind: 'team'; id: string; name: string; color: string }
  | { kind: 'user'; id: string; name: string };

function selectionLabel(sel: AssigneeSelection): string {
  if (sel.kind === 'none') return 'ยังไม่มอบหมาย';
  if (sel.kind === 'team') return `ทีม: ${sel.name}`;
  return sel.name;
}

function selectionToAssignedTo(sel: AssigneeSelection): string | null {
  return sel.kind === 'user' ? sel.id : null;
}

function assignedToToSelection(
  assignedTo: string | null,
  membersData: FarmMembersData | undefined,
): AssigneeSelection {
  if (!assignedTo) return { kind: 'none' };
  const member = membersData?.allMembers.find((m) => m.id === assignedTo);
  if (member) return { kind: 'user', id: member.id, name: member.name };
  return { kind: 'none' };
}

// ─── InlineAssigneePicker ─────────────────────────────────────────────────────

const InlineAssigneePicker = ({
  membersData,
  value,
  onChange,
}: {
  membersData: FarmMembersData | undefined;
  value: AssigneeSelection;
  onChange: (sel: AssigneeSelection) => void;
}) => {
  const isSelected = (sel: AssigneeSelection) => {
    if (sel.kind !== value.kind) return false;
    if (sel.kind === 'team' && value.kind === 'team') return sel.id === value.id;
    if (sel.kind === 'user' && value.kind === 'user') return sel.id === value.id;
    return sel.kind === 'none';
  };

  const btnBase = 'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm text-left transition-all';
  const btnSelected = 'border-[#03662c] bg-[#03662c]/5 text-[#03662c] font-semibold';
  const btnIdle = 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white hover:border-gray-300';

  if (!membersData) {
    return <p className="text-sm text-gray-400 py-2">กำลังโหลดรายชื่อ…</p>;
  }

  const { teams } = membersData;

  return (
    <div className="flex flex-col gap-2">
      {/* ── ยังไม่มอบหมาย ── */}
      <button
        type="button"
        onClick={() => onChange({ kind: 'none' })}
        className={`${btnBase} ${isSelected({ kind: 'none' }) ? btnSelected : btnIdle}`}
      >
        <ClipboardList size={15} className="shrink-0 text-gray-400" />
        <span>ยังไม่มอบหมาย</span>
        {isSelected({ kind: 'none' }) && <span className="ml-auto text-[#03662c]">✓</span>}
      </button>

      {/* ── ทีม ── */}
      {teams.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1 px-1">ทีม</p>
          <div className="grid grid-cols-2 gap-2">
            {teams.map((team: FarmTeam) => {
              const sel: AssigneeSelection = { kind: 'team', id: team.id, name: team.name, color: team.color };
              const active = isSelected(sel);
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => onChange(sel)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${active ? 'border-[#03662c] bg-[#03662c]/5 font-semibold' : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'}`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: team.color }}
                  />
                  <span className="truncate text-gray-800 text-xs">{team.name}</span>
                  {active && <span className="ml-auto text-[#03662c] text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── สมาชิก ── */}
      {membersData.allMembers.length > 0 ? (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1 px-1">สมาชิก</p>
          <div className="flex flex-col gap-1.5">
            {membersData.allMembers.map((m) => {
              const sel: AssigneeSelection = { kind: 'user', id: m.id, name: m.name };
              const active = isSelected(sel);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChange(sel)}
                  className={`${btnBase} ${active ? btnSelected : btnIdle}`}
                >
                  <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-xs font-bold text-gray-600">
                    {m.name.charAt(0)}
                  </span>
                  <span className="flex-1 min-w-0 truncate">{m.name}</span>
                  {active && <span className="text-[#03662c]">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        teams.length === 0 && (
          <p className="text-sm text-gray-400 py-1 px-1">ยังไม่มีสมาชิกในองค์กร</p>
        )
      )}
    </div>
  );
};

// ─── TaskModal (create + edit) ────────────────────────────────────────────────

type TaskFormData = {
  title: string;
  description?: string;
  dueDate?: string | null;
  assignedTo?: string | null;
};

type TaskModalInitial = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  assignedTo: string | null;
};

const TaskModal = ({
  isOpen,
  onOpenChange,
  membersData,
  landName,
  isPending,
  initialValues,
  onSubmit,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  membersData: FarmMembersData | undefined;
  landName: string;
  isPending?: boolean;
  initialValues?: TaskModalInitial;
  onSubmit: (data: TaskFormData) => void;
}) => {
  const isEditMode = !!initialValues;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState<AssigneeSelection>({ kind: 'none' });
  const [titleError, setTitleError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialValues) {
      setTitle(initialValues.title);
      setDescription(initialValues.description ?? '');
      setDueDate(initialValues.dueDate ?? '');
      setAssignee(assignedToToSelection(initialValues.assignedTo, membersData));
    } else {
      setTitle('');
      setDescription('');
      setDueDate('');
      setAssignee({ kind: 'none' });
    }
    setTitleError(false);
  }, [isOpen, initialValues, membersData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => onOpenChange(false);

  const handleSubmit = () => {
    const t = title.trim();
    if (!t) { setTitleError(true); return; }
    setTitleError(false);
    onSubmit({
      title: t,
      description: description.trim() || undefined,
      dueDate: dueDate || null,
      assignedTo: selectionToAssignedTo(assignee),
    });
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={handleClose}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg bg-white text-gray-800 border border-gray-200 shadow-2xl">
            <Modal.CloseTrigger className="hover:bg-gray-100" />
            <Modal.Header className="border-b border-gray-100">
              <div className="flex flex-col gap-0.5">
                <Modal.Heading className="font-bold uppercase tracking-wider text-gray-800">
                  {isEditMode ? 'แก้ไขงาน' : 'สร้างงานใหม่'}
                </Modal.Heading>
                <p className="text-xs text-gray-400">{landName}</p>
              </div>
            </Modal.Header>

            <Modal.Body className="pb-6 flex flex-col gap-5 max-h-[70dvh] overflow-y-auto">
              {/* ── ชื่องาน ── */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  ชื่องาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น รดน้ำแปลง A, ฉีดยาป้องกันโรค"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(false); }}
                  className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:bg-white transition-all ${titleError ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-gray-200 bg-gray-50 focus:border-[#03662c]'}`}
                />
                {titleError && <p className="text-xs text-red-500">กรุณากรอกชื่องาน</p>}
              </div>

              {/* ── รายละเอียด ── */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">รายละเอียด</label>
                <textarea
                  placeholder="อธิบายขั้นตอน วัสดุ หรือหมายเหตุ"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#03662c] focus:bg-white transition-all"
                />
              </div>

              {/* ── กำหนดเสร็จ ── */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  กำหนดเสร็จ
                </label>
                <DatePicker
                  value={dueDate ? parseDate(dueDate) : null}
                  onChange={(date) => setDueDate(date ? date.toString() : '')}
                  className="w-full"
                >
                  <DateField.Group fullWidth className="rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#03662c] focus-within:bg-white transition-all">
                    <DateField.Input className="px-4 py-3 text-sm text-gray-800">
                      {(segment) => <DateField.Segment segment={segment} />}
                    </DateField.Input>
                    <DateField.Suffix>
                      <DatePicker.Trigger>
                        <DatePicker.TriggerIndicator />
                      </DatePicker.Trigger>
                    </DateField.Suffix>
                  </DateField.Group>
                  <DatePicker.Popover>
                    <Calendar aria-label="กำหนดเสร็จ">
                      <Calendar.Header>
                        <Calendar.NavButton slot="previous" />
                        <Calendar.Heading />
                        <Calendar.NavButton slot="next" />
                      </Calendar.Header>
                      <Calendar.Grid>
                        <Calendar.GridHeader>
                          {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                        </Calendar.GridHeader>
                        <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                      </Calendar.Grid>
                    </Calendar>
                  </DatePicker.Popover>
                </DatePicker>
              </div>

              {/* ── มอบหมายให้ ── */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    มอบหมายให้
                  </label>
                  {assignee.kind !== 'none' && (
                    <span className="text-xs font-medium text-[#03662c] bg-[#03662c]/8 rounded-full px-2 py-0.5">
                      {selectionLabel(assignee)}
                    </span>
                  )}
                </div>
                <InlineAssigneePicker membersData={membersData} value={assignee} onChange={setAssignee} />
              </div>
            </Modal.Body>

            {/* ── Footer ── */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!title.trim() || isPending}
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-white bg-[#03662c] hover:bg-[#03662c]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-[#03662c]/30 flex items-center gap-2"
              >
                {isPending && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isPending
                  ? (isEditMode ? 'กำลังบันทึก...' : 'กำลังสร้าง...')
                  : (isEditMode ? 'บันทึก' : 'สร้างงาน')}
              </button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

// ─── TaskItem ─────────────────────────────────────────────────────────────────

const TASK_MENU_ITEMS = [
  { id: 'edit', label: 'แก้ไข', icon: <Pencil size={13} /> },
  { id: 'delete', label: 'ลบ', icon: <Trash2 size={13} />, variant: 'danger' as const },
];

const TaskItem = ({
  task,
  membersData,
  onAdvance,
  onEdit,
  onDelete,
}: {
  task: LandTask;
  membersData: FarmMembersData | undefined;
  onAdvance: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const meta = STATUS_META[task.status];
  const assignee = memberName(membersData, task.assigneeId);
  return (
    <div className="rounded-xl px-3 py-2.5 hover:bg-black/5 transition-colors group">
      <div className="flex items-start gap-2">
        <button
          onClick={() => onAdvance(task.id)}
          className="mt-0.5 shrink-0 focus:outline-none"
          title="เลื่อนสถานะ"
        >
          <span className={`size-2.5 rounded-full block transition-transform group-hover:scale-125 ${meta.dot}`} />
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900 leading-snug block">{task.title}</span>
          {task.description && (
            <span className="text-xs text-gray-500 block mt-0.5 line-clamp-2">{task.description}</span>
          )}
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${meta.badge}`}>
              {meta.label}
            </span>
            {task.dueLabel && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                <CalendarIcon size={9} />
                {task.dueLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 rounded-md px-1.5 py-0.5 text-[10px] font-medium">
              <UserRound size={9} />
              {assignee}
            </span>
          </div>
        </div>
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu
            items={TASK_MENU_ITEMS}
            onAction={(action) => {
              if (action === 'edit') onEdit(task.id);
              if (action === 'delete') onDelete(task.id);
            }}
          />
        </div>
      </div>
    </div>
  );
};


// ─── LandDetailPage ───────────────────────────────────────────────────────────

type Props = {
  land: LandPopupData;
  farmId: string;
  farmName: string;
  onBack: () => void;
};

export const LandDetailPage = ({ land, farmId, farmName, onBack }: Props) => {
  const landId = String(land.id);
  const orgId = useAtomValue(currentOrgIdAtom);

  const { data: dbTasks, isLoading: tasksLoading } = useLandTasksQuery(landId);
  const { data: membersData } = useOrgMembersWithFarmTeamsQuery(orgId, farmId);
  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  const tasks = useMemo<LandTask[]>(() => {
    return (dbTasks ?? []).flatMap((t) => {
      const uiStatus = dbStatusToUi(t.status);
      if (!uiStatus) return [];
      return [{ id: t.id, title: t.title, status: uiStatus, assigneeId: t.assigned_to, dueLabel: formatDueDate(t.due_date), description: t.description ?? undefined }];
    });
  }, [dbTasks]);

  // ─── Filter + search ───────────────────────────────────────────────────────

  const [filter, setFilter] = useState<FilterKey>('pending_confirmation');
  const [search, setSearch] = useState('');

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filter !== 'all') result = result.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q));
    }
    return result;
  }, [tasks, filter, search]);

  const counts = useMemo(() => ({
    all: tasks.length,
    pending_confirmation: tasks.filter((t) => t.status === 'pending_confirmation').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  }), [tasks]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const advanceStatus = useCallback((taskId: string) => {
    const dbTask = dbTasks?.find((t) => t.id === taskId);
    if (!dbTask) return;
    updateStatus.mutate({ taskId, status: advanceDbStatus(dbTask.status), landId });
  }, [dbTasks, updateStatus, landId]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskModalInitial | null>(null);

  const handleCreate = useCallback((formData: TaskFormData) => {
    createTask.mutate(
      { title: formData.title, description: formData.description, farmId, landId, assignedTo: formData.assignedTo, dueDate: formData.dueDate },
      { onSuccess: () => { setIsCreateModalOpen(false); setFilter('pending_confirmation'); } },
    );
  }, [createTask, farmId, landId]);

  const handleEdit = useCallback((taskId: string) => {
    const dbTask = dbTasks?.find((t) => t.id === taskId);
    if (!dbTask) return;
    setEditingTask({
      id: dbTask.id,
      title: dbTask.title,
      description: dbTask.description,
      dueDate: dbTask.due_date,
      assignedTo: dbTask.assigned_to,
    });
  }, [dbTasks]);

  const handleEditSubmit = useCallback((data: TaskFormData) => {
    if (!editingTask) return;
    updateTask.mutate(
      { input: { taskId: editingTask.id, title: data.title, description: data.description ?? null, dueDate: data.dueDate, assignedTo: data.assignedTo }, landId, farmId },
      { onSuccess: () => setEditingTask(null) },
    );
  }, [updateTask, editingTask, landId, farmId]);

  const handleDelete = useCallback((taskId: string) => {
    deleteTask.mutate({ taskId, landId, farmId });
  }, [deleteTask, landId, farmId]);

  const mapImageUrl = useMemo(() => buildPolygonMapUrl(land.coords, land.color ?? '#22c55e'), [land.coords, land.color]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Column className="flex flex-col  max-h-[calc(90vh)] overflow-hidden">

      {/* ── Navigation header ── */}
      <div className="px-2 pt-3 pb-0 shrink-0">
        <Row className="items-center">
          <Button variant="ghost" size="sm" className="gap-0.5 text-[#007AFF] px-2" onPress={onBack}>
            <ChevronLeft size={20} strokeWidth={2.5} />
            <span className="text-[15px]">{'กลับ'}</span>
          </Button>
          <span className="flex-1 text-center text-[17px] font-semibold text-gray-900 truncate px-2">
            {land.name}
          </span>
          <div className="w-16 shrink-0" />
        </Row>
      </div>

      {/* ── Satellite banner ── */}
      {mapImageUrl && (
        <div className="mx-3 mt-2 shrink-0 relative h-[110px] rounded-2xl overflow-hidden">
          <img src={mapImageUrl} alt={land.name} className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
            <div>
              <p className="text-white font-bold text-sm drop-shadow">{land.name}</p>
              {land.type && (
                <span className="inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: `${land.color ?? '#22c55e'}55`, color: '#fff' }}>
                  {land.type}
                </span>
              )}
            </div>
            <span className="text-white/70 text-[10px]">{counts.all} งาน</span>
          </div>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="px-3 mt-2 shrink-0 grid grid-cols-3 gap-2">
        {(['pending_confirmation', 'in_progress', 'done'] as TaskStatus[]).map((s) => {
          const m = STATUS_META[s];
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(active ? 'all' : s)}
              className={`flex flex-col items-center rounded-xl py-2 px-1 transition-colors cursor-pointer ${active ? 'bg-gray-900' : 'bg-black/5 hover:bg-black/8'}`}
            >
              <span className={`text-lg font-bold leading-none ${active ? 'text-white' : 'text-gray-800'}`}>{counts[s]}</span>
              <span className={`text-[9px] mt-0.5 font-medium leading-tight text-center ${active ? 'text-white/80' : 'text-gray-500'}`}>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Search bar ── */}
      <div className="px-3 mt-3 shrink-0">
        <Row className="items-center gap-2 bg-black/6 rounded-[10px] px-3 h-9">
          <SearchIcon size={14} className="text-gray-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            placeholder="ค้นหางาน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Row>
      </div>

      <Separator className="mx-3 mt-2" />

      {/* ── Task list ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {tasksLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">กำลังโหลดงาน…</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            {search ? 'ไม่พบงานที่ค้นหา' : 'ยังไม่มีงาน'}
          </div>
        ) : (
          filteredTasks.map((task, i) => (
            <div key={task.id}>
              <TaskItem
                task={task}
                membersData={membersData}
                onAdvance={advanceStatus}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
              {i < filteredTasks.length - 1 && <Separator className="my-0.5" />}
            </div>
          ))
        )}
      </div>

      {/* ── Create task button ── */}
      <div className="px-3 pb-3 pt-2 shrink-0">
        <Button
          className="w-full bg-[#03662c] text-white hover:bg-[#03662c]/80 border border-[#03662c]/30 font-bold tracking-wider uppercase text-xs"
          onPress={() => setIsCreateModalOpen(true)}
          size="lg"
        >
          <Plus size={14} />
          สร้างงานใหม่
        </Button>
      </div>

      <TaskModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        membersData={membersData}
        landName={land.name}
        isPending={createTask.isPending}
        onSubmit={handleCreate}
      />

      <TaskModal
        isOpen={!!editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        membersData={membersData}
        landName={land.name}
        initialValues={editingTask ?? undefined}
        isPending={updateTask.isPending}
        onSubmit={handleEditSubmit}
      />
    </Column>
  );
};
