import { supabase } from '@lib/supabase/client';
import type { Enums } from '@lib/supabase/database.types';

// ─── Types ───────────────────────────────────────────────

export type DbTaskStatus = Enums<'task_status'>;
export type DbTaskPriority = Enums<'task_priority'>;

export type DbTask = {
  id: string;
  title: string;
  description: string | null;
  status: DbTaskStatus;
  priority: DbTaskPriority;
  due_date: string | null;
  completed_at: string | null;
  farm_id: string;
  land_id: string | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  assignee: { full_name: string | null } | null;
  land: { name: string } | null;
};

export type DbLandTask = {
  id: string;
  title: string;
  description: string | null;
  status: DbTaskStatus;
  priority: DbTaskPriority;
  due_date: string | null;
  farm_id: string;
  land_id: string | null;
  assigned_to: string | null;
  assignee: { full_name: string | null } | null;
};

// ─── Shared select fragments ─────────────────────────────

const TASK_SELECT = `
  id, title, description, status, priority, due_date, completed_at,
  farm_id, land_id, created_by, assigned_to, created_at, updated_at,
  assignee:profiles!tasks_assigned_to_profiles_fkey ( full_name ),
  land:lands ( name )
`;

const LAND_TASK_SELECT = `
  id, title, description, status, priority, due_date,
  farm_id, land_id, assigned_to,
  assignee:profiles!tasks_assigned_to_profiles_fkey ( full_name )
`;

// ─── Queries ─────────────────────────────────────────────

export async function fetchAllTasks(): Promise<DbTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as DbTask[];
}

export async function fetchTasksByFarm(farmId: string): Promise<DbTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('farm_id', farmId)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as DbTask[];
}

export async function fetchTasksByLand(landId: string): Promise<DbLandTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(LAND_TASK_SELECT)
    .eq('land_id', landId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as DbLandTask[];
}

// ─── Mutations ───────────────────────────────────────────

export type CreateTaskInput = {
  title: string;
  description?: string;
  farmId: string;
  landId: string;
  assignedTo?: string | null;
  dueDate?: string | null;
};

export async function createTask(input: CreateTaskInput) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description || null,
      farm_id: input.farmId,
      land_id: input.landId,
      assigned_to: input.assignedTo ?? null,
      due_date: input.dueDate ?? null,
      status: 'pending',
      priority: 'medium',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTaskStatus(taskId: string, status: DbTaskStatus) {
  const { error } = await supabase
    .from('tasks')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', taskId);

  if (error) throw error;
}

export async function updateTaskAssignee(
  taskId: string,
  assignedTo: string | null,
) {
  const { error } = await supabase
    .from('tasks')
    .update({ assigned_to: assignedTo })
    .eq('id', taskId);

  if (error) throw error;
}

// ─── Utilities ───────────────────────────────────────────

export function advanceDbStatus(current: DbTaskStatus): DbTaskStatus {
  if (current === 'pending') return 'in_progress';
  if (current === 'in_progress') return 'completed';
  return 'in_progress';
}
