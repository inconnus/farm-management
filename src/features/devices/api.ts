import { supabase } from '@lib/supabase/client';
import type { Tables } from '@lib/supabase/database.types';

export type DbDevice = Tables<'farm_devices'>;

export async function fetchAllDevices(): Promise<DbDevice[]> {
  const { data, error } = await supabase
    .from('farm_devices')
    .select('*')
    .eq('is_active', true)
    .order('created_at');

  if (error) throw error;
  return data ?? [];
}

export async function fetchDevicesByFarm(farmId: string): Promise<DbDevice[]> {
  const { data, error } = await supabase
    .from('farm_devices')
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('created_at');

  if (error) throw error;
  return data ?? [];
}
