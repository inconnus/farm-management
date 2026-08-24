import {
  DEFAULT_SIMULATION_SPEED_FACTOR,
  measurePathLengthKm,
} from '@features/vehicles/utils/pathMath';
import { supabase } from '@lib/supabase/client';
import type { Enums, Json, Tables } from '@lib/supabase/database.types';

export type DbAutomatedJobStatus = Enums<'automated_job_status'>;

/** งานที่ถือว่ายานพาหนะยังไม่ว่าง */
export const ACTIVE_AUTOMATED_JOB_STATUSES: DbAutomatedJobStatus[] = [
  'queued',
  'working',
  'paused',
];

export type BusyAutomatedDevice = {
  deviceId: string;
  jobTitle: string;
  status: DbAutomatedJobStatus;
};

export type DbAutomatedJobDevice = Pick<
  Tables<'farm_devices'>,
  'id' | 'name' | 'device_type' | 'lat' | 'lng' | 'config'
>;

export type DbAutomatedJob = {
  id: string;
  farm_id: string;
  land_id: string;
  device_id: string;
  title: string;
  description: string | null;
  status: DbAutomatedJobStatus;
  path_progress: number;
  work_path: Json;
  speed_kmh: number | null;
  path_length_km: number | null;
  simulation_speed_factor: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  device: DbAutomatedJobDevice;
};

const JOB_SELECT = `
  id, farm_id, land_id, device_id, title, description, status,
  path_progress, work_path, speed_kmh, path_length_km, simulation_speed_factor,
  started_at, completed_at, created_at,
  device:farm_devices!automated_jobs_device_id_fkey (
    id, name, device_type, lat, lng, config
  )
`;

export function parseWorkPath(value: Json): [number, number][] {
  if (!Array.isArray(value)) return [];
  const path: [number, number][] = [];
  for (const point of value) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const lng = Number(point[0]);
    const lat = Number(point[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      path.push([lng, lat]);
    }
  }
  return path;
}

export async function fetchAutomatedJobsByLand(
  landId: string,
): Promise<DbAutomatedJob[]> {
  const { data, error } = await supabase
    .from('automated_jobs')
    .select(JOB_SELECT)
    .eq('land_id', landId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as DbAutomatedJob[];
}

export async function fetchBusyAutomatedDevicesByFarm(
  farmId: string,
): Promise<BusyAutomatedDevice[]> {
  const { data, error } = await supabase
    .from('automated_jobs')
    .select('device_id, title, status')
    .eq('farm_id', farmId)
    .in('status', ACTIVE_AUTOMATED_JOB_STATUSES);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    deviceId: row.device_id,
    jobTitle: row.title,
    status: row.status,
  }));
}

export type CreateAutomatedJobInput = {
  farmId: string;
  landId: string;
  deviceId: string;
  title: string;
  description?: string;
  workPath: [number, number][];
  speedKmh?: number;
};

export async function createAutomatedJob(input: CreateAutomatedJobInput) {
  const pathLengthKm = measurePathLengthKm(input.workPath);

  const { data, error } = await supabase
    .from('automated_jobs')
    .insert({
      farm_id: input.farmId,
      land_id: input.landId,
      device_id: input.deviceId,
      title: input.title,
      description: input.description || null,
      work_path: input.workPath,
      path_length_km: pathLengthKm,
      simulation_speed_factor: DEFAULT_SIMULATION_SPEED_FACTOR,
      speed_kmh: input.speedKmh ?? 4.2,
      status: 'working',
      path_progress: 0,
      started_at: new Date().toISOString(),
    })
    .select(JOB_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as DbAutomatedJob;
}
