import { supabase } from '@lib/supabase/client';
import type { Tables } from '@lib/supabase/database.types';

export type DbTileset = Tables<'organization_tilesets'>;

export async function fetchTilesets(): Promise<DbTileset[]> {
  const { data, error } = await supabase
    .from('organization_tilesets')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return data ?? [];
}
