import type { DbDevice } from '@features/devices/api';
import type { VehicleType } from '@features/vehicles/types';
import { DroneIcon, TractorIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

export const AUTOMATED_VEHICLE_DEVICE_TYPES = ['tractor', 'drone'] as const;
export type AutomatedVehicleDeviceType =
  (typeof AUTOMATED_VEHICLE_DEVICE_TYPES)[number];

export function isAutomatedVehicleDevice(
  device: Pick<DbDevice, 'device_type'>,
): device is DbDevice & { device_type: AutomatedVehicleDeviceType } {
  return AUTOMATED_VEHICLE_DEVICE_TYPES.includes(
    device.device_type as AutomatedVehicleDeviceType,
  );
}

export function deviceTypeToVehicleType(deviceType: string): VehicleType {
  return deviceType === 'drone' ? 'drone' : 'autonomous_tractor';
}

type VehicleTypeMeta = {
  label: string;
  deviceLabel: string;
  markerBg: string;
  markerBgHover: string;
  markerBorderHover: string;
  markerIcon: string;
  listBg: string;
  listBorder: string;
  listIcon: string;
  listSelectedBg: string;
  listSelectedRing: string;
  accent: string;
  accentLight: string;
  pathPlanned: string;
  pathCompleted: string;
  defaultSpeedKmh: number;
};

export const VEHICLE_TYPE_META: Record<VehicleType, VehicleTypeMeta> = {
  autonomous_tractor: {
    label: 'รถไถไร้คนขับ',
    deviceLabel: 'รถไถ',
    markerBg: 'bg-[#03662c]',
    markerBgHover: 'group-hover:bg-[#045a28]',
    markerBorderHover: 'group-hover:border-emerald-200',
    markerIcon: 'text-white group-hover:text-emerald-100',
    listBg: 'bg-[#03662c]/10',
    listBorder: 'border-[#03662c]/20',
    listIcon: 'text-[#03662c]',
    listSelectedBg: 'bg-[#03662c]/10',
    listSelectedRing: 'ring-[#03662c]/30',
    accent: 'text-[#03662c]',
    accentLight: 'bg-[#03662c]/10',
    pathPlanned: '#4ade80',
    pathCompleted: '#03662c',
    defaultSpeedKmh: 4.2,
  },
  drone: {
    label: 'โดรน',
    deviceLabel: 'โดรน',
    markerBg: 'bg-sky-600',
    markerBgHover: 'group-hover:bg-sky-700',
    markerBorderHover: 'group-hover:border-sky-200',
    markerIcon: 'text-white group-hover:text-sky-100',
    listBg: 'bg-sky-50',
    listBorder: 'border-sky-200',
    listIcon: 'text-sky-600',
    listSelectedBg: 'bg-sky-50',
    listSelectedRing: 'ring-sky-300',
    accent: 'text-sky-600',
    accentLight: 'bg-sky-50',
    pathPlanned: '#7dd3fc',
    pathCompleted: '#0284c7',
    defaultSpeedKmh: 28,
  },
};

export function getVehicleTypeMeta(type: VehicleType) {
  return VEHICLE_TYPE_META[type];
}

export function getDeviceSpeedKmh(
  device: Pick<DbDevice, 'device_type' | 'config'>,
): number {
  const vehicleType = deviceTypeToVehicleType(device.device_type);
  const fallback = VEHICLE_TYPE_META[vehicleType].defaultSpeedKmh;

  if (
    device.config !== null &&
    typeof device.config === 'object' &&
    !Array.isArray(device.config)
  ) {
    const value = (device.config as Record<string, unknown>).speed_kmh;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }

  return fallback;
}

type VehicleTypeIconProps = {
  type: VehicleType;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function VehicleTypeIcon({
  type,
  size = 20,
  className,
  style,
}: VehicleTypeIconProps) {
  if (type === 'drone') {
    return <DroneIcon size={size} className={className} style={style} />;
  }
  return <TractorIcon size={size} className={className} style={style} />;
}

export function deviceTypeLabel(deviceType: string): string {
  return deviceType === 'drone'
    ? VEHICLE_TYPE_META.drone.deviceLabel
    : VEHICLE_TYPE_META.autonomous_tractor.deviceLabel;
}

export function renderDeviceTypeBadge(deviceType: string): ReactNode {
  const type = deviceTypeToVehicleType(deviceType);
  const meta = getVehicleTypeMeta(type);
  return (
    <span
      className={`text-[10px] font-medium uppercase tracking-wide ${meta.accent}`}
    >
      {meta.deviceLabel}
    </span>
  );
}
