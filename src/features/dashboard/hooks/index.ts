import { getKasetkornAuthContext } from '@features/auth/kasetkornAuth';
import { authModeAtom, pluksangSessionAtom } from '@features/auth/store';
import { sensorApiSettingsAtom } from '@shared/store/sensorApiStore';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import {
  cameraQueries,
  farmerQueries,
  iotDeviceQueries,
  landQueries,
} from '../data/queries';

function useKasetkornAuth() {
  const authMode = useAtomValue(authModeAtom);
  const pluksangSession = useAtomValue(pluksangSessionAtom);
  return getKasetkornAuthContext(authMode, pluksangSession);
}

export const useFarmerQuery = () => {
  const authMode = useAtomValue(authModeAtom);
  const pluksangSession = useAtomValue(pluksangSessionAtom);
  const auth = useKasetkornAuth();
  const appFarmerId =
    authMode === 'pluksang' ? pluksangSession?.appFarmerId : undefined;

  return useQuery({
    ...farmerQueries.profile(appFarmerId, auth),
    enabled: authMode === 'pluksang' && !!appFarmerId,
  });
};

export const useCamerasQuery = () => {
  const auth = useKasetkornAuth();
  return useQuery({ ...cameraQueries.all(auth) });
};

export const useKasetkornCamerasQuery = (enabled = true) => {
  const auth = useKasetkornAuth();
  return useQuery({ ...cameraQueries.raw(auth), enabled });
};

export const useIOTDevicesQuery = () => {
  const sensorApiSettings = useAtomValue(sensorApiSettingsAtom);
  const auth = useKasetkornAuth();

  return useQuery({
    ...iotDeviceQueries.all(sensorApiSettings, auth),
  });
};

export const useLandQuery = (appFarmId?: string) => {
  return useQuery({
    ...landQueries.detail(appFarmId),
  });
};

export const useLandsQueries = (appFarmIds: string[]) => {
  return useQueries({
    queries: appFarmIds.map((appFarmId) => ({
      ...landQueries.detail(appFarmId),
    })),
  });
};

export const useIOTTelemetryQueries = (
  appIotIds: string[],
  enabled = true,
) => {
  const sensorApiSettings = useAtomValue(sensorApiSettingsAtom);
  const auth = useKasetkornAuth();

  return useQueries({
    queries: appIotIds.map((appIotId) => ({
      ...iotDeviceQueries.telemetry(appIotId, sensorApiSettings, auth),
      enabled,
      refetchInterval: enabled ? 30000 : false,
    })),
  });
};
