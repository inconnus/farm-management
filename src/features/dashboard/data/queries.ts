import type { KasetkornAuthContext } from './api';
import type { SensorApiSettings } from '@shared/store/sensorApiStore';
import { queryOptions } from '@tanstack/react-query';
import {
  fetchAllCameras,
  fetchCameraToken,
  fetchFarmer,
  fetchGetLand,
  fetchIOTDevices,
  fetchIOTDeviceTelemetry,
} from './api';
import { kasetkornCameraToCameraData, isGkKasetkornCamera } from './cameras';

export const iotDeviceQueries = {
  all: (
    sensorApiSettings: Pick<SensorApiSettings, 'useMockData'>,
    auth: KasetkornAuthContext,
  ) =>
    queryOptions({
      queryKey: [
        'iot-devices',
        sensorApiSettings.useMockData,
        auth.scope,
        auth.scope === 'farmer' ? auth.appFarmerId : null,
      ] as const,
      queryFn: () => fetchIOTDevices(sensorApiSettings, auth),
    }),
  telemetry: (
    appIotId: string | undefined,
    sensorApiSettings: SensorApiSettings,
    auth: KasetkornAuthContext,
  ) =>
    queryOptions({
      queryKey: [
        'iot-telemetry',
        appIotId,
        sensorApiSettings.mode,
        sensorApiSettings.timeRange,
        sensorApiSettings.useMockData,
        auth.scope,
        auth.scope === 'farmer' ? auth.appFarmerId : null,
      ] as const,
      queryFn: () => fetchIOTDeviceTelemetry(appIotId!, sensorApiSettings, auth),
      enabled: !!appIotId,
      select: (data) => ({ appIotId, telemetry: data?.data?.[0] }),
    }),
};

export const cameraQueries = {
  raw: (auth: KasetkornAuthContext) =>
    queryOptions({
      queryKey: [
        'kasetkorn-cameras-raw',
        auth.scope,
        auth.scope === 'farmer' ? auth.appFarmerId : null,
      ] as const,
      queryFn: () => fetchAllCameras(auth),
    }),
  all: (auth: KasetkornAuthContext) =>
    queryOptions({
      queryKey: [
        'kasetkorn-cameras',
        auth.scope,
        auth.scope === 'farmer' ? auth.appFarmerId : null,
      ] as const,
      queryFn: async () => {
        const items = (await fetchAllCameras(auth)).filter(isGkKasetkornCamera);
        let accessToken: string | undefined;
        try {
          accessToken = await fetchCameraToken(auth);
        } catch (error) {
          console.warn(
            '[cameras] GetToken failed; rendering markers without live stream',
            error,
          );
        }
        return items.map((cam) =>
          kasetkornCameraToCameraData(cam, accessToken),
        );
      },
    }),
};

export const farmerQueries = {
  profile: (appFarmerId: string | undefined, auth: KasetkornAuthContext) =>
    queryOptions({
      queryKey: ['farmer-profile', appFarmerId] as const,
      queryFn: () => fetchFarmer(appFarmerId!, auth),
      enabled: !!appFarmerId && auth.scope === 'farmer',
      staleTime: 5 * 60 * 1000,
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
