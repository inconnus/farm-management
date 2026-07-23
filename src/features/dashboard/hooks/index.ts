import { sensorApiSettingsAtom } from '@shared/store/sensorApiStore';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { cameraQueries, iotDeviceQueries, landQueries } from '../data/queries';

export const useCamerasQuery = () => useQuery({ ...cameraQueries.all() });

export const useIOTDevicesQuery = () => {
  const sensorApiSettings = useAtomValue(sensorApiSettingsAtom);

  return useQuery({
    ...iotDeviceQueries.all(sensorApiSettings),
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

export const useIOTTelemetryQueries = (appIotIds: string[]) => {
  const sensorApiSettings = useAtomValue(sensorApiSettingsAtom);

  return useQueries({
    queries: appIotIds.map((appIotId) => ({
      ...iotDeviceQueries.telemetry(appIotId, sensorApiSettings),
      refetchInterval: 10000,
    })),
  });
};
