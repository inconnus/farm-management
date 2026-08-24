import type { LandData } from '@shared/types/lands';
import * as turf from '@turf/turf';
import type { VehicleData } from '../types';
import { generateWorkPath } from '../utils/generateWorkPath';
import {
  DEFAULT_SIMULATION_SPEED_FACTOR,
  measurePathLengthKm,
} from '../utils/pathMath';

export type { WorkPathOptions } from '../utils/generateWorkPath';
export {
  computeDefaultWorkPathOptions,
  DEFAULT_WORK_PATH_OPTIONS,
  generateWorkPath,
} from '../utils/generateWorkPath';

/** แปลงที่ใช้สำหรับ mock เส้นทางรถไถ */
export const MOCK_TRACTOR_LAND_ID = '477812f5-8a3e-4e88-b7fc-fdd0941d5342';

function headingBetween(from: [number, number], to: [number, number]): number {
  const dLng = to[0] - from[0];
  const dLat = to[1] - from[1];
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

export function positionAlongPath(
  path: [number, number][],
  progress: number,
): {
  lat: number;
  lng: number;
  heading: number;
} {
  if (path.length === 0) {
    return { lat: 0, lng: 0, heading: 0 };
  }
  if (path.length === 1) {
    return { lat: path[0][1], lng: path[0][0], heading: 0 };
  }

  const line = turf.lineString(path);
  const lengthKm = turf.length(line, { units: 'kilometers' });
  const targetKm = lengthKm * progress;
  const point = turf.along(line, targetKm, { units: 'kilometers' });
  const [lng, lat] = point.geometry.coordinates;

  const nextKm = Math.min(targetKm + 0.002, lengthKm);
  const nextPoint = turf.along(line, nextKm, { units: 'kilometers' });
  const [nextLng, nextLat] = nextPoint.geometry.coordinates;

  return {
    lat,
    lng,
    heading: headingBetween([lng, lat], [nextLng, nextLat]),
  };
}

export function getCompletedPathCoords(
  path: [number, number][],
  progress: number,
): [number, number][] {
  if (path.length < 2 || progress <= 0) return [];
  if (progress >= 1) return path;

  const line = turf.lineString(path);
  const lengthKm = turf.length(line, { units: 'kilometers' });
  const targetKm = lengthKm * progress;
  const slice = turf.lineSliceAlong(line, 0, targetKm, { units: 'kilometers' });
  return slice.geometry.coordinates as [number, number][];
}

export function getMockVehiclesForLand(
  farmId: string,
  land: LandData,
): VehicleData[] {
  if (land.coords.length < 3) return [];

  const workPath = generateWorkPath(land.coords);
  if (workPath.length < 2) return [];

  const pathProgress = 0.42;
  const position = positionAlongPath(workPath, pathProgress);

  return [
    {
      id: `vehicle-tractor-${farmId}-${land.id}`,
      farmId,
      name: 'รถไถไร้คนขับ #1',
      jobTitle: 'ไถพร่นแปลง',
      type: 'autonomous_tractor',
      status: 'working',
      lat: position.lat,
      lng: position.lng,
      heading: position.heading,
      batteryPercent: 78,
      speedKmh: 4.2,
      landName: land.name,
      workPath,
      pathProgress,
      startedAt: new Date(Date.now() - 3600_000).toISOString(),
      pathLengthKm: measurePathLengthKm(workPath),
      simulationSpeedFactor: DEFAULT_SIMULATION_SPEED_FACTOR,
      jobStatus: 'working',
    },
  ];
}

/** @deprecated ใช้ getMockVehiclesForLand แทน */
export function getMockVehiclesForFarm(
  farmId: string,
  lands: LandData[],
): VehicleData[] {
  const land =
    lands.find((l) => l.id === MOCK_TRACTOR_LAND_ID && l.coords.length >= 3) ??
    lands.find((l) => l.coords.length >= 3);
  if (!land) return [];
  return getMockVehiclesForLand(farmId, land);
}
