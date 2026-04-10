import { useQueries, useQuery } from '@tanstack/react-query';
import { iotDeviceQueries, landQueries } from '../data/queries';

export const useIOTDevicesQuery = () => {
  return useQuery({
    ...iotDeviceQueries.all(),
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
  return useQueries({
    queries: appIotIds.map((appIotId) => ({
      ...iotDeviceQueries.telemetry(appIotId),
      refetchInterval: 10000,
    })),
  });
};
