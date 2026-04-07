import { queryOptions } from '@tanstack/react-query';
import { fetchIOTDevices, fetchGetLand, fetchIOTDeviceTelemetry } from './api';

export const iotDeviceQueries = {
  all: () =>
    queryOptions({
      queryKey: ['iot-devices'] as const,
      queryFn: fetchIOTDevices,
    }),
  telemetry: (appIotId: string | undefined) =>
    queryOptions({
      queryKey: ['iot-telemetry', appIotId] as const,
      queryFn: () => fetchIOTDeviceTelemetry(appIotId!),
      enabled: !!appIotId,
      select: (data) => ({ appIotId, telemetry: data?.data?.[0] }),
    }),
};

export const landQueries = {
  detail: (appFarmId: string | undefined) =>
    queryOptions({
      queryKey: ['land', appFarmId] as const,
      queryFn: () => fetchGetLand(appFarmId!),
      enabled: !!appFarmId,
    }),
};
