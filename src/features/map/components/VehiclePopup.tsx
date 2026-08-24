import { Column, Row } from '@app/layout';
import {
  useLiveJobProgress,
  vehicleToProgressInput,
} from '@features/automated-jobs/hooks/useLiveJobProgress';
import type { VehicleData } from '@features/vehicles/types';
import {
  getVehicleTypeMeta,
  VehicleTypeIcon,
} from '@features/vehicles/utils/vehicleDisplay';
import { Card, Chip } from '@heroui/react';
import { BatteryMediumIcon, GaugeIcon, MapPinIcon } from 'lucide-react';
import { VehicleLiveFeed } from './VehicleLiveFeed';

const STATUS_LABEL: Record<VehicleData['status'], string> = {
  working: 'กำลังทำงาน',
  idle: 'พร้อมใช้งาน',
  charging: 'กำลังชาร์จ',
  offline: 'ออฟไลน์',
};

const STATUS_CHIP: Record<VehicleData['status'], string> = {
  working: 'bg-emerald-50 text-emerald-700',
  idle: 'bg-sky-50 text-sky-700',
  charging: 'bg-amber-50 text-amber-700',
  offline: 'bg-gray-100 text-gray-600',
};

type VehiclePopupProps = {
  vehicle: VehicleData;
};

export const VehiclePopup = ({ vehicle }: VehiclePopupProps) => {
  const meta = getVehicleTypeMeta(vehicle.type);
  const showLiveFeed = vehicle.type === 'autonomous_tractor';
  const liveProgress = useLiveJobProgress(vehicleToProgressInput(vehicle));
  const progressPct = Math.round(liveProgress * 100);

  return (
    <Card
      className={`flex flex-col overflow-hidden border border-gray-200 rounded-2xl p-0 shadow-2xl gap-0 bg-white ${
        showLiveFeed ? 'w-[340px]' : 'w-[300px]'
      }`}
    >
      {showLiveFeed && <VehicleLiveFeed label={vehicle.name} />}

      <div
        className={`px-4 pt-4 pb-3 border-b border-gray-100 ${showLiveFeed ? 'pt-3' : ''}`}
      >
        <Row className="items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.accentLight}`}
          >
            <VehicleTypeIcon
              type={vehicle.type}
              size={18}
              className={meta.listIcon}
            />
          </div>
          <Column className="gap-0 min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {vehicle.jobTitle}
            </span>
            <span className="text-[11px] text-gray-500">
              {vehicle.name} · {meta.label}
            </span>
          </Column>
        </Row>
      </div>

      <Column className="px-4 py-3 gap-3">
        <Row className="items-center justify-between">
          <span className="text-xs text-gray-500">สถานะ</span>
          <Chip className={STATUS_CHIP[vehicle.status]}>
            <Chip.Label className="text-[11px] font-medium">
              {STATUS_LABEL[vehicle.status]}
            </Chip.Label>
          </Chip>
        </Row>

        <Row className="gap-2">
          <Row className="flex-1 items-center gap-1.5 bg-gray-50 rounded-xl px-2.5 py-2">
            <BatteryMediumIcon
              size={14}
              className="text-emerald-600 shrink-0"
            />
            <Column className="gap-0">
              <span className="text-[10px] text-gray-400">แบตเตอรี่</span>
              <span className="text-xs font-semibold text-gray-800">
                {vehicle.batteryPercent}%
              </span>
            </Column>
          </Row>
          <Row className="flex-1 items-center gap-1.5 bg-gray-50 rounded-xl px-2.5 py-2">
            <GaugeIcon size={14} className="text-blue-600 shrink-0" />
            <Column className="gap-0">
              <span className="text-[10px] text-gray-400">ความเร็ว</span>
              <span className="text-xs font-semibold text-gray-800">
                {vehicle.speedKmh} km/h
              </span>
            </Column>
          </Row>
        </Row>

        <Row className="items-center gap-1.5 text-xs text-gray-600">
          <MapPinIcon size={12} className="text-gray-400 shrink-0" />
          <span>แปลง: {vehicle.landName}</span>
        </Row>

        <Column className="gap-1.5">
          <Row className="items-center justify-between">
            <span className="text-xs text-gray-500">ความคืบหน้าเส้นทาง</span>
            <span className={`text-xs font-semibold ${meta.accent}`}>
              {progressPct}%
            </span>
          </Row>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-linear"
              style={{
                width: `${progressPct}%`,
                backgroundColor: meta.pathCompleted,
              }}
            />
          </div>
        </Column>
      </Column>
    </Card>
  );
};
