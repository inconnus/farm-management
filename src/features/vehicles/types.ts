export type VehicleStatus = 'working' | 'idle' | 'charging' | 'offline';

export type VehicleType = 'autonomous_tractor' | 'drone';

export type VehicleData = {
  id: string;
  farmId: string;
  /** ชื่อรถ / อุปกรณ์ */
  name: string;
  /** ชื่องานอัตโนมัติที่กำลังทำ */
  jobTitle: string;
  type: VehicleType;
  status: VehicleStatus;
  lat: number;
  lng: number;
  heading: number;
  batteryPercent: number;
  speedKmh: number;
  landName: string;
  workPath: [number, number][];
  pathProgress: number;
  /** จาก automated_jobs — ใช้คำนวณตำแหน่งร่วมกับ server */
  startedAt: string | null;
  pathLengthKm: number;
  simulationSpeedFactor: number;
  jobStatus: string;
};
