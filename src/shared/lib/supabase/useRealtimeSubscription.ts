import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { supabase } from './client';
import { isAuthenticatedAtom } from '@features/auth/store';

type RealtimeOptions = {
  channel: string;
  table: string;
  filter?: string;
  enabled?: boolean;
};

/**
 * Subscribes to Supabase Realtime postgres_changes for a table.
 * Uses a ref for the callback to avoid channel resubscription on every render.
 */
export function useRealtimeSubscription(
  { channel, table, filter, enabled = true }: RealtimeOptions,
  onEvent: () => void,
) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    if (!isAuthenticated || !enabled) return;

    const pgConfig: {
      event: '*';
      schema: 'public';
      table: string;
      filter?: string;
    } = {
      event: '*',
      schema: 'public',
      table,
    };
    if (filter) pgConfig.filter = filter;

    const ch = supabase
      .channel(channel)
      .on('postgres_changes', pgConfig, () => callbackRef.current())
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAuthenticated, enabled, channel, table, filter]);
}
