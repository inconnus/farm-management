import { Column, Row } from '@app/layout';
import {
  Button,
  Card,
  Chip,
  CloseButton,
  Dropdown,
  Input,
  Label,
  Modal,
  Separator,
  Tabs,
  TextArea,
  useOverlayState,
} from '@heroui/react';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Ellipsis,
  EllipsisVerticalIcon,
  Plus,
  RotateCcw,
  SearchIcon,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FarmMembersData } from '../../farms/hooks/useFarmMembersQuery';
import { useFarmMembersQuery } from '../../farms/hooks/useFarmMembersQuery';
import {
  advanceDbStatus,
  useCreateTask,
  useLandTasksQuery,
  useUpdateTaskAssignee,
  useUpdateTaskStatus,
} from '../../tasks/hooks/useLandTasksQuery';
import type { LandPopupData, LandTask, TaskStatus } from '../types';

// ── helpers ────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

function buildPolygonMapUrl(
  coords: [number, number][],
  color = '#22c55e',
  width = 380,
  height = 260,
): string | null {
  if (coords.length < 3) return null;

  const ring = [...coords];
  const [firstLng, firstLat] = ring[0];
  const [lastLng, lastLat] = ring[ring.length - 1];
  if (firstLng !== lastLng || firstLat !== lastLat) {
    ring.push([firstLng, firstLat]);
  }

  const geojson = {
    type: 'Feature',
    properties: {
      stroke: color,
      'stroke-width': 2,
      'stroke-opacity': 0.9,
      fill: color,
      'fill-opacity': 0.2,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
  const encoded = encodeURIComponent(JSON.stringify(geojson));
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/geojson(${encoded})/auto/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}&padding=70&attribution=false&logo=false`;
}

function dbStatusToUi(status: string): TaskStatus | null {
  if (status === 'pending') return 'pending_confirmation';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'completed') return 'done';
  return null;
}

function formatDueDate(dueDate: string | null): string | undefined {
  if (!dueDate) return undefined;
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dueDate));
}

const memberName = (
  membersData: FarmMembersData | undefined,
  assigneeId: string | null,
): string => {
  if (!assigneeId) return 'ยังไม่มอบหมาย';
  return (
    membersData?.allMembers.find((m) => m.id === assigneeId)?.name ?? 'ไม่ระบุ'
  );
};

// ── TAB constants ───────────────────────────────────────────────────────────

const TAB_PENDING = 'pending_confirmation';
const TAB_IN_PROGRESS = 'in_progress';
const TAB_DONE = 'done';

// ── MemberSections helper ───────────────────────────────────────────────────

const MemberSections = ({
  membersData,
  prefix,
  onSelect,
}: {
  membersData: FarmMembersData;
  prefix: string;
  onSelect: (userId: string | null) => void;
}) => {
  const { teams, unassigned } = membersData;
  const hasTeams = teams.length > 0;

  return (
    <>
      <Dropdown.Section>
        <Dropdown.Item
          id={`${prefix}__none`}
          textValue="ยังไม่มอบหมาย"
          onAction={() => onSelect(null)}
        >
          <Label className="text-sm text-gray-500">ยังไม่มอบหมาย</Label>
        </Dropdown.Item>
      </Dropdown.Section>

      {hasTeams
        ? teams.map((team) => (
            <Dropdown.Section key={team.id}>
              <Dropdown.Item
                id={`${prefix}__section__${team.id}`}
                textValue={team.name}
                isDisabled
              >
                <Row className="items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: team.color }}
                  />
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {team.name}
                  </Label>
                </Row>
              </Dropdown.Item>
              {team.members.map((m) => (
                <Dropdown.Item
                  key={m.id}
                  id={`${prefix}${m.id}`}
                  textValue={m.name}
                  onAction={() => onSelect(m.id)}
                >
                  <Label className="text-sm">{m.name}</Label>
                </Dropdown.Item>
              ))}
            </Dropdown.Section>
          ))
        : null}

      {unassigned.length > 0 && (
        <Dropdown.Section>
          {hasTeams && (
            <Dropdown.Item
              id={`${prefix}__section__unassigned`}
              textValue="ไม่มีทีม"
              isDisabled
            >
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                ไม่มีทีม
              </Label>
            </Dropdown.Item>
          )}
          {unassigned.map((m) => (
            <Dropdown.Item
              key={m.id}
              id={`${prefix}${m.id}`}
              textValue={m.name}
              onAction={() => onSelect(m.id)}
            >
              <Label className="text-sm">{m.name}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Section>
      )}
    </>
  );
};

// ── FormAssigneePicker ──────────────────────────────────────────────────────

const FormAssigneePicker = ({
  membersData,
  value,
  onChange,
}: {
  membersData: FarmMembersData | undefined;
  value: string | null;
  onChange: (id: string | null) => void;
}) => {
  const label = memberName(membersData, value);
  return (
    <Dropdown>
      <Dropdown.Trigger className="inline-flex w-full rounded-xl outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-emerald-600/30">
        <Button
          variant="ghost"
          className="h-10 w-full justify-between gap-2 rounded-xl border border-gray-200/80 bg-white px-3 text-left shadow-none hover:bg-white"
        >
          <span className="truncate text-sm font-medium text-gray-800">
            {label}
          </span>
          <ChevronDown size={16} className="shrink-0 text-gray-400" />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover className="min-w-[var(--trigger-width)]">
        <Dropdown.Menu aria-label="มอบหมายผู้รับผิดชอบ">
          {membersData ? (
            <MemberSections
              membersData={membersData}
              prefix="form__"
              onSelect={onChange}
            />
          ) : (
            <Dropdown.Section>
              <Dropdown.Item id="loading" textValue="กำลังโหลด" isDisabled>
                <Label className="text-sm text-gray-400">กำลังโหลด…</Label>
              </Dropdown.Item>
            </Dropdown.Section>
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};

// ── CreateTaskModal ─────────────────────────────────────────────────────────

type CreateTaskFormData = {
  title: string;
  description?: string;
  dueDate?: string | null;
  assignedTo?: string | null;
};

const CreateTaskModal = ({
  state,
  membersData,
  landName,
  isPending,
  onSubmit,
}: {
  state: ReturnType<typeof useOverlayState>;
  membersData: FarmMembersData | undefined;
  landName: string;
  isPending?: boolean;
  onSubmit: (data: CreateTaskFormData) => void;
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);

  useEffect(() => {
    if (!state.isOpen) return;
    setTitle('');
    setDescription('');
    setDueDate('');
    setAssignedTo(null);
    setTitleError(false);
  }, [state.isOpen]);

  const submit = () => {
    const t = title.trim();
    if (!t) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    onSubmit({
      title: t,
      description: description.trim() || undefined,
      dueDate: dueDate || null,
      assignedTo,
    });
  };

  return (
    <Modal state={state}>
      <Modal.Backdrop
        isDismissable
        className="z-[10050] bg-black/40 backdrop-blur-[2px]"
      >
        <Modal.Container placement="center" size="md" className="z-[10051]">
          <Modal.Dialog className="max-h-[min(90dvh,640px)] w-[min(100vw-1.5rem,400px)] overflow-hidden">
            <Modal.Header className="flex flex-row items-start justify-between gap-2 border-b border-gray-200/70 pb-3">
              <Column className="min-w-0 gap-0.5">
                <Modal.Heading className="text-lg font-bold text-gray-900">
                  สร้างงานใหม่
                </Modal.Heading>
                <span className="truncate text-xs text-gray-500">
                  {landName}
                </span>
              </Column>
              <Modal.CloseTrigger aria-label="ปิด" />
            </Modal.Header>
            <Modal.Body className="flex max-h-[min(60dvh,480px)] flex-col gap-4 overflow-y-auto py-4">
              <Column className="gap-1.5">
                <Label className="text-sm font-medium text-gray-800">
                  ชื่องาน <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น รดน้ำแปลง A"
                  className={
                    titleError
                      ? 'w-full rounded-xl border border-red-300 bg-white'
                      : 'w-full rounded-xl border border-gray-200/80 bg-white'
                  }
                />
                {titleError ? (
                  <span className="text-xs text-red-600">กรุณากรอกชื่องาน</span>
                ) : null}
              </Column>
              <Column className="gap-1.5">
                <Label className="text-sm font-medium text-gray-800">
                  รายละเอียด
                </Label>
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="อธิบายขั้นตอน วัสดุ หรือหมายเหตุ"
                  rows={4}
                  className="min-h-[104px] w-full resize-y rounded-xl border border-gray-200/80 bg-white"
                />
              </Column>
              <Column className="gap-1.5">
                <Label className="text-sm font-medium text-gray-800">
                  กำหนดเสร็จ (ไม่บังคับ)
                </Label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200/80 bg-white px-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </Column>
              <Column className="gap-1.5">
                <Label className="text-sm font-medium text-gray-800">
                  มอบหมายให้
                </Label>
                <FormAssigneePicker
                  membersData={membersData}
                  value={assignedTo}
                  onChange={setAssignedTo}
                />
              </Column>
            </Modal.Body>
            <Modal.Footer className="flex flex-row justify-end gap-2 border-t border-gray-200/70 pt-3">
              <Button
                variant="ghost"
                className="font-semibold text-gray-700 shadow-none"
                onPress={state.close}
                isDisabled={isPending}
              >
                ยกเลิก
              </Button>
              <Button
                className="bg-emerald-600 font-semibold text-white shadow-none hover:bg-emerald-700"
                onPress={submit}
                isDisabled={isPending}
              >
                {isPending ? 'กำลังสร้าง…' : 'สร้างงาน'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

// ── TaskAssigneeDropdown ────────────────────────────────────────────────────

const TaskAssigneeDropdown = ({
  taskId,
  membersData,
  assigneeId,
  isDisabled,
  onAssign,
}: {
  taskId: string;
  membersData: FarmMembersData | undefined;
  assigneeId: string | null;
  isDisabled?: boolean;
  onAssign: (taskId: string, memberId: string | null) => void;
}) => {
  const label = memberName(membersData, assigneeId);
  return (
    <Dropdown>
      <Dropdown.Trigger
        className="inline-flex min-w-0 max-w-[140px] rounded-lg outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-green-600/40"
        aria-label="เลือกผู้รับผิดชอบ"
        isDisabled={isDisabled}
      >
        <Button
          size="sm"
          variant="ghost"
          className="h-8 min-w-0 max-w-full shrink gap-1 rounded-lg bg-gray-100/80 px-2 py-0 text-xs font-medium text-gray-700 shadow-none border-none"
        >
          <UserRound size={14} className="shrink-0 text-gray-500" />
          <span className="truncate">{label}</span>
          <ChevronDown size={14} className="shrink-0 text-gray-400" />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover className="min-w-[200px]">
        <Dropdown.Menu aria-label="ผู้รับผิดชอบ">
          {membersData ? (
            <MemberSections
              membersData={membersData}
              prefix={`${taskId}::`}
              onSelect={(userId) => onAssign(taskId, userId)}
            />
          ) : (
            <Dropdown.Section>
              <Dropdown.Item id="loading" textValue="กำลังโหลด" isDisabled>
                <Label className="text-sm text-gray-400">กำลังโหลด…</Label>
              </Dropdown.Item>
            </Dropdown.Section>
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};

// ── TaskRow ─────────────────────────────────────────────────────────────────

// ── TaskTabScrollPanel ──────────────────────────────────────────────────────

// ── LandPopupContent ────────────────────────────────────────────────────────

type LandPopupContentProps = {
  land: LandPopupData;
  /** 'popup' (default) wraps in a Card with fixed sizing; 'sidebar' fills the parent container */
  mode?: 'popup' | 'sidebar';
};

export const LandPopupContent = ({ land, mode = 'popup' }: LandPopupContentProps) => {
  const isSidebar = mode === 'sidebar';
  const landId = String(land.id);
  const farmId = land.farmId;

  const { data: dbTasks, isLoading: tasksLoading } = useLandTasksQuery(landId);
  const { data: membersData } = useFarmMembersQuery(farmId);

  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const updateAssignee = useUpdateTaskAssignee();

  const tasks = useMemo<LandTask[]>(() => {
    return (dbTasks ?? []).flatMap((t) => {
      const uiStatus = dbStatusToUi(t.status);
      if (!uiStatus) return [];
      return [
        {
          id: t.id,
          title: t.title,
          status: uiStatus,
          assigneeId: t.assigned_to,
          dueLabel: formatDueDate(t.due_date),
          description: t.description ?? undefined,
        },
      ];
    });
  }, [dbTasks]);

  const pending = tasks.filter((t) => t.status === 'pending_confirmation');
  const inProgress = tasks.filter((t) => t.status === 'in_progress');
  const completed = tasks.filter((t) => t.status === 'done');

  const [taskTab, setTaskTab] = useState<string>(TAB_PENDING);

  const onTabsSelectionChange = useCallback((key: string | number | null) => {
    if (key != null) setTaskTab(String(key));
  }, []);

  const assign = useCallback(
    (taskId: string, memberId: string | null) => {
      updateAssignee.mutate({ taskId, assignedTo: memberId, landId });
    },
    [updateAssignee, landId],
  );

  const advanceStatus = useCallback(
    (taskId: string) => {
      const dbTask = dbTasks?.find((t) => t.id === taskId);
      if (!dbTask) return;
      updateStatus.mutate({
        taskId,
        status: advanceDbStatus(dbTask.status),
        landId,
      });
    },
    [dbTasks, updateStatus, landId],
  );

  const createModal = useOverlayState();

  const handleCreate = useCallback(
    (formData: {
      title: string;
      description?: string;
      dueDate?: string | null;
      assignedTo?: string | null;
    }) => {
      if (!farmId) return;
      createTask.mutate(
        {
          title: formData.title,
          description: formData.description,
          farmId,
          landId,
          assignedTo: formData.assignedTo,
          dueDate: formData.dueDate,
        },
        {
          onSuccess: () => {
            createModal.close();
            setTaskTab(TAB_PENDING);
          },
        },
      );
    },
    [createTask, farmId, landId, createModal],
  );

  const isUpdating = updateStatus.isPending || updateAssignee.isPending;

  const mapImageUrl = useMemo(
    () => buildPolygonMapUrl(land.coords, land.color ?? '#22c55e'),
    [land.coords, land.color],
  );

  const content = (
    <>
      {mapImageUrl && (
        <div className="relative h-[120px] w-full shrink-0 overflow-hidden">
          <img
            src={mapImageUrl}
            alt={land.name}
            className="h-full w-full object-cover"
            loading="eager"
          />
          {!isSidebar && (
            <CloseButton
              className="absolute top-2 right-2"
              onPress={() => {}}
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-sm font-bold text-white drop-shadow-md">
              {land.name}
            </h3>
            {land.type && (
              <p className="text-xs text-white/80 drop-shadow-md">
                {land.type}
              </p>
            )}
          </div>
        </div>
      )}

        <Tabs
          selectedKey={taskTab}
          onSelectionChange={onTabsSelectionChange}
          className="flex min-h-0 flex-1 flex-col m-0 gap-0  "
        >
          <Tabs.ListContainer className="shrink-0">
            <Tabs.List
              aria-label="สถานะงาน"
              className="grid w-full grid-cols-3 gap-0.5 rounded-2xl bg-gray-100/90 "
            >
              <Tabs.Tab
                id={TAB_PENDING}
                className="min-h-[2.75rem]  rounded-3xl px-1 py-1.5 text-[10px] font-semibold leading-tight text-gray-600 data-[selected=true]:bg-white data-[selected=true]:text-sky-900 data-[selected=true]:shadow-sm sm:px-1.5 sm:text-[11px]"
              >
                <Row className="w-full items-center gap-0.5 justify-center">
                  <span className="text-center leading-tight">รอยืนยัน</span>
                  <Chip
                    size="sm"
                    className="h-5 min-w-5 border-none bg-sky-200/80 px-1 text-[10px] text-sky-950"
                  >
                    <Chip.Label>{pending.length}</Chip.Label>
                  </Chip>
                </Row>
                <Tabs.Indicator className="hidden" />
              </Tabs.Tab>
              <Tabs.Tab
                id={TAB_IN_PROGRESS}
                className="min-h-[2.75rem] rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-tight text-gray-600 data-[selected=true]:bg-white data-[selected=true]:text-amber-900 data-[selected=true]:shadow-sm sm:px-1.5 sm:text-[11px]"
              >
                <Row className="w-full items-center gap-0.5 justify-center">
                  <span className="text-center leading-tight">
                    กำลังดำเนินการ
                  </span>
                  <Chip
                    size="sm"
                    className="h-5 min-w-5 border-none bg-amber-200/80 px-1 text-[10px] text-amber-950"
                  >
                    <Chip.Label>{inProgress.length}</Chip.Label>
                  </Chip>
                </Row>
                <Tabs.Indicator className="hidden" />
              </Tabs.Tab>
              <Tabs.Tab
                id={TAB_DONE}
                className="min-h-[2.75rem] rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-tight text-gray-600 data-[selected=true]:bg-white data-[selected=true]:text-emerald-900 data-[selected=true]:shadow-sm sm:px-1.5 sm:text-[11px]"
              >
                <Row className="w-full items-center gap-0.5 justify-center">
                  <span className="text-center leading-tight">สำเร็จ</span>
                  <Chip
                    size="sm"
                    className="h-5 min-w-5 border-none bg-emerald-200/80 px-1 text-[10px] text-emerald-950"
                  >
                    <Chip.Label>{completed.length}</Chip.Label>
                  </Chip>
                </Row>
                <Tabs.Indicator className="hidden" />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          {tasksLoading ? (
            <Column className="flex-1 items-center justify-center py-8">
              <Label className="text-sm text-gray-400">กำลังโหลดงาน…</Label>
            </Column>
          ) : (
            <>
              <Tabs.Panel
                id={TAB_PENDING}
                className="flex min-h-0 flex-1  px-3 flex-col  overflow-hidden outline-none data-[focus-visible]:outline-none"
              >
                <Column className="min-h-0 flex-1 overflow-y-auto overscroll-contain  [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300/80">
                  {tasks.length === 0 ? (
                    <Label className="py-8 text-center text-sm text-gray-400">
                      ไม่มีงาน
                    </Label>
                  ) : (
                    <Column className="bg-white rounded-2xl overflow-hidden">
                      {/* <Row className="items-center gap-2 bg-black/6 rounded-[10px] px-3 h-9">
                        <SearchIcon size={14} className="text-gray-400 shrink-0" />
                        <input
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                          placeholder="ค้นหา"
                          value={''}
                        />
                      </Row> */}
                      {tasks.map((task) => (
                        <>
                          <Row
                            className={`items-start gap-2 cursor-pointer hover:bg-black/5 transition-colors p-3  py-3  `}
                          >
                            <Column className="min-w-0 flex-1 gap-1 ">
                              <Row className=" items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-gray-800 leading-snug">
                                  {task.title}
                                </span>
                              </Row>
                              <span className="text-[13px] text-gray-500">
                                {task.description}
                              </span>
                              <Row className=" items-center gap-1 justify-between">
                                <Row className=" items-center gap-1">
                                  <Calendar
                                    size={14}
                                    className="shrink-0 text-gray-500"
                                  />
                                  <span className="text-xs text-gray-500">
                                    {task.dueLabel}
                                  </span>
                                </Row>
                                <img
                                  src="https://kkndpqqmsswhgnupsznq.supabase.co/storage/v1/object/public/Public/460039832_1939010103263800_8042369095264618016_n.webp"
                                  alt="calendar"
                                  className="w-4 h-4 rounded-full object-cover"
                                />
                              </Row>
                            </Column>
                            <Button isIconOnly variant="ghost">
                              <EllipsisVerticalIcon className="size-4 text-gray-500" />
                            </Button>
                          </Row>
                          <Separator className="my-0" />
                        </>
                      ))}
                    </Column>
                  )}
                </Column>
              </Tabs.Panel>

              <Tabs.Panel
                id={TAB_IN_PROGRESS}
                className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[focus-visible]:outline-none"
              >
                <Column className="min-h-0 flex-1 gap-2 overflow-y-auto overscroll-contain px-1 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300/80">
                  {tasks.length === 0 ? (
                    <Label className="py-8 text-center text-sm text-gray-400">
                      ไม่มีงาน
                    </Label>
                  ) : (
                    <Column className="gap-2">
                      {tasks.map((task) => (
                        <Row
                          className={`items-start gap-2 cursor-pointer hover:bg-gray-100/50 rounded-lg p-2 `}
                        >
                          <Column className="min-w-0 flex-1 gap-1">
                            <span className="text-base font-semibold text-gray-800 leading-snug">
                              {task.title}
                            </span>
                            <span className="text-sm text-gray-500">
                              {task.description}
                            </span>
                            <span className="text-sm text-gray-500">
                              {task.dueLabel}
                            </span>
                          </Column>
                        </Row>
                      ))}
                    </Column>
                  )}
                </Column>
              </Tabs.Panel>

              <Tabs.Panel
                id={TAB_DONE}
                className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[focus-visible]:outline-none"
              >
                <Column className="min-h-0 flex-1 gap-2 overflow-y-auto overscroll-contain px-1 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300/80">
                  {tasks.length === 0 ? (
                    <Label className="py-8 text-center text-sm text-gray-400">
                      ไม่มีงาน
                    </Label>
                  ) : (
                    <Column className="gap-2">
                      {tasks.map((task) => (
                        <Row
                          className={`items-start gap-2 cursor-pointer hover:bg-gray-100/50 rounded-lg p-2 `}
                        >
                          <Column className="min-w-0 flex-1 gap-1">
                            <span className="text-base font-semibold text-gray-800 leading-snug">
                              {task.title}
                            </span>
                            <span className="text-sm text-gray-500">
                              {task.description}
                            </span>
                            <span className="text-sm text-gray-500">
                              {task.dueLabel}
                            </span>
                          </Column>
                        </Row>
                      ))}
                    </Column>
                  )}
                </Column>
              </Tabs.Panel>
            </>
          )}
        </Tabs>
    </>
  );

  return (
    <>
      {isSidebar ? (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {content}
        </div>
      ) : (
        <Card className="flex h-[80vh] max-h-[min(80vh,640px)] w-[380px] flex-col overflow-hidden border-none rounded-3xl bg-white/85 p-0 shadow-2xl backdrop-blur-xl gap-0">
          {content}
        </Card>
      )}
      <CreateTaskModal
        state={createModal}
        membersData={membersData}
        landName={land.name}
        isPending={createTask.isPending}
        onSubmit={handleCreate}
      />
    </>
  );
};
