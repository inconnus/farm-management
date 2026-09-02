import { getKasetkornAuthContext } from '@features/auth/kasetkornAuth';
import { authModeAtom, pluksangSessionAtom } from '@features/auth/store';
import { fetchPtzContinuous } from '@features/dashboard/data/api';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo, useRef } from 'react';
import {
  PTZ_STOP,
  type PtzDirection,
  ptzVector,
} from '../data/ptz';

const PTZ_STOP_DEBOUNCE_MS = 50;
const PTZ_STOP_RETRY_GAP_MS = 80;
const PTZ_STOP_RETRY_COUNT = 3;

export function useEzvizPtz(deviceSerial: string | undefined, enabled = true) {
  const authMode = useAtomValue(authModeAtom);
  const pluksangSession = useAtomValue(pluksangSessionAtom);
  const auth = useMemo(
    () => getKasetkornAuthContext(authMode, pluksangSession),
    [authMode, pluksangSession],
  );

  const activeDirectionRef = useRef<PtzDirection | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendPtz = useCallback(
    async (pan: number, tilt: number) => {
      if (!deviceSerial?.trim()) return;
      await fetchPtzContinuous(deviceSerial.trim(), pan, tilt, auth);
    },
    [deviceSerial, auth],
  );

  const stopPtz = useCallback(async () => {
    activeDirectionRef.current = null;
    for (let i = 0; i < PTZ_STOP_RETRY_COUNT; i++) {
      try {
        await sendPtz(PTZ_STOP.pan, PTZ_STOP.tilt);
      } catch {
        // retry stop
      }
      if (i < PTZ_STOP_RETRY_COUNT - 1) {
        await new Promise((r) => setTimeout(r, PTZ_STOP_RETRY_GAP_MS));
      }
    }
  }, [sendPtz]);

  const startPtz = useCallback(
    async (direction: PtzDirection) => {
      activeDirectionRef.current = direction;
      const { pan, tilt } = ptzVector(direction);
      try {
        await sendPtz(pan, tilt);
      } catch (error) {
        console.warn('[PTZ] start failed', error);
      }
    },
    [sendPtz],
  );

  const onDirectionChanged = useCallback(
    (direction: PtzDirection, pressed: boolean) => {
      if (!enabled || !deviceSerial?.trim()) return;

      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }

      if (pressed) {
        startPtz(direction);
        return;
      }

      stopTimerRef.current = setTimeout(() => {
        stopPtz();
        stopTimerRef.current = null;
      }, PTZ_STOP_DEBOUNCE_MS);
    },
    [enabled, deviceSerial, startPtz, stopPtz],
  );

  return { onDirectionChanged, enabled };
}
