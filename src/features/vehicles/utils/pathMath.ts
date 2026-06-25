import * as turf from '@turf/turf';

export const DEFAULT_SIMULATION_SPEED_FACTOR = 1;

export type JobProgressInput = {
  startedAt: string | null;
  speedKmh: number;
  pathLengthKm: number;
  simulationSpeedFactor?: number;
  status: string;
  storedProgress?: number;
};

/** คำนวณ progress จากเวลาเริ่มงาน — สูตรเดียวกับ server tick */
export function computeJobProgress({
  startedAt,
  speedKmh,
  pathLengthKm,
  simulationSpeedFactor = DEFAULT_SIMULATION_SPEED_FACTOR,
  status,
  storedProgress = 0,
}: JobProgressInput): number {
  if (status === 'completed') return 1;
  if (status !== 'working' || !startedAt || pathLengthKm <= 0) {
    return Math.min(1, Math.max(0, storedProgress));
  }

  const elapsedH = (Date.now() - new Date(startedAt).getTime()) / 3_600_000;
  const distanceKm = elapsedH * speedKmh * simulationSpeedFactor;
  return Math.min(1, distanceKm / pathLengthKm);
}

export function measurePathLengthKm(path: [number, number][]): number {
  if (path.length < 2) return 0;
  return Math.max(turf.length(turf.lineString(path), { units: 'kilometers' }), 0.001);
}
