import { supabase } from '@lib/supabase/client';
import type { Json, Tables } from '@lib/supabase/database.types';

export type DbDevice = Tables<'farm_devices'>;

function configAsRecord(config: Json | null): Record<string, unknown> {
  if (config !== null && typeof config === 'object' && !Array.isArray(config)) {
    return { ...(config as Record<string, unknown>) };
  }
  return {};
}

/**
 * Merge `patch` into existing JSON `config` (read → merge → write).
 * Needed for correct RLS (UPDATE typically requires SELECT) and to preserve other config keys.
 */
export async function patchDeviceConfig(
  id: string,
  patch: Record<string, unknown>,
): Promise<DbDevice> {
  const { data: row, error: fetchError } = await supabase
    .from('farm_devices')
    .select('config')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!row) {
    throw new Error(
      'ไม่พบอุปกรณ์หรือไม่มีสิทธิ์อ่านข้อมูล — ตรวจสอบ RLS policy SELECT บน farm_devices',
    );
  }

  const merged = { ...configAsRecord(row.config), ...patch } as Json;

  const { data: updated, error } = await supabase
    .from('farm_devices')
    .update({ config: merged })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!updated) {
    throw new Error(
      'อัปเดต config ไม่สำเร็จ — ไม่มีแถวถูกแก้ไข (สิทธิ์ UPDATE หรือ id อุปกรณ์ไม่ตรงกับ RLS)',
    );
  }
  return updated;
}

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
