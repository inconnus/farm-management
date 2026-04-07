import { Column, Row } from '@app/layout';
import { Chip, Label } from '@heroui/react';
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  ClockIcon,
  Loader2Icon,
  XCircleIcon,
} from 'lucide-react';
import type { DbTask } from '../hooks/useTasksQuery';
import { useTasksQuery } from '../hooks/useTasksQuery';

const statusConfig = {
  pending: {
    label: 'รอดำเนินการ',
    icon: CircleDashedIcon,
    color: '#6b7280',
    bg: '#f3f4f6',
  },
  in_progress: {
    label: 'กำลังดำเนินการ',
    icon: Loader2Icon,
    color: '#2563eb',
    bg: '#eff6ff',
  },
  completed: {
    label: 'เสร็จสิ้น',
    icon: CheckCircle2Icon,
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  cancelled: {
    label: 'ยกเลิก',
    icon: XCircleIcon,
    color: '#dc2626',
    bg: '#fef2f2',
  },
} as const;

const priorityColor = {
  low: '#6b7280',
  medium: '#d97706',
  high: '#ea580c',
  urgent: '#dc2626',
} as const;

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  const diff = Math.round(
    (date.getTime() - today.setHours(0, 0, 0, 0)) / 86400000,
  );
  if (diff === 0) return 'วันนี้';
  if (diff === 1) return 'พรุ่งนี้';
  if (diff === -1) return 'เมื่อวาน';
  if (diff < 0) return `เกินกำหนด ${Math.abs(diff)} วัน`;
  return `อีก ${diff} วัน`;
}

function TaskCard({ task }: { task: DbTask }) {
  const status = statusConfig[task.status] ?? statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm">
      <Row className="items-start gap-2.5">
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: status.bg }}
        >
          <StatusIcon size={14} style={{ color: status.color }} />
        </div>

        <Column className="flex-1 min-w-0 gap-1">
          <Label className="font-medium text-[14px] text-gray-900 leading-tight">
            {task.title}
          </Label>

          {task.description && (
            <Label className="text-[12px] text-gray-500 line-clamp-1">
              {task.description}
            </Label>
          )}

          <Row className="items-center gap-1.5 flex-wrap mt-0.5">
            {task.due_date && (
              <Chip
                className="text-[11px] gap-1"
                style={{
                  background: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0',
                }}
              >
                <ClockIcon size={10} />
                <Chip.Label>{formatDueDate(task.due_date)}</Chip.Label>
              </Chip>
            )}
            <Chip
              className="text-[11px]"
              style={{
                background: `${priorityColor[task.priority]}15`,
                color: priorityColor[task.priority],
              }}
            >
              <Chip.Label>
                {task.priority === 'low'
                  ? 'ต่ำ'
                  : task.priority === 'medium'
                    ? 'ปกติ'
                    : task.priority === 'high'
                      ? 'สูง'
                      : 'เร่งด่วน'}
              </Chip.Label>
            </Chip>
            {task.land?.name && (
              <Chip className="text-[11px] bg-black/5">
                <Chip.Label className="text-gray-600">
                  {task.land.name}
                </Chip.Label>
              </Chip>
            )}
          </Row>
        </Column>
      </Row>
    </div>
  );
}

export const TasksSidebar = () => {
  const { data: tasks = [], isLoading, error } = useTasksQuery();

  const grouped = tasks.reduce<Record<string, DbTask[]>>((acc, task) => {
    const key = task.status;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <Column className="w-[350px] max-h-[calc(100dvh-1rem)] overflow-y-auto bg-white/85 backdrop-blur-xl rounded-3xl pointer-events-auto mt-2 border border-gray-200 shadow-xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <Label className="text-[17px] font-semibold text-gray-900">
          ตารางงาน
        </Label>
        <Chip className="bg-green-50 border border-green-200">
          <Chip.Label className="text-[11px] text-green-700">
            {tasks.length} งาน
          </Chip.Label>
        </Chip>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 gap-2">
          <Loader2Icon size={18} className="animate-spin text-green-600" />
          <Label className="text-gray-400 text-sm">กำลังโหลดงาน...</Label>
        </div>
      )}

      {error && (
        <div className="mx-4 mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          ไม่สามารถโหลดข้อมูลงานได้
        </div>
      )}

      {!isLoading && !error && (
        <Column className="px-3 pb-4 gap-4">
          {(['in_progress', 'pending', 'completed', 'cancelled'] as const).map(
            (status) => {
              const items = grouped[status];
              if (!items?.length) return null;
              const cfg = statusConfig[status];
              return (
                <Column key={status} className="gap-2">
                  <Row className="items-center gap-1.5 px-1">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: cfg.color }}
                    />
                    <Label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">
                      {cfg.label} ({items.length})
                    </Label>
                  </Row>
                  <Column className="gap-2">
                    {items.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </Column>
                </Column>
              );
            },
          )}

          {tasks.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                <CheckCircle2Icon size={24} className="text-gray-400" />
              </div>
              <Label className="text-gray-400 text-sm">ไม่มีงานในขณะนี้</Label>
            </div>
          )}
        </Column>
      )}
    </Column>
  );
};
