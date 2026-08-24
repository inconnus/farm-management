import { Column, Row } from '@app/layout';
import type { BusyAutomatedDevice } from '@features/automated-jobs/api';
import type { DbDevice } from '@features/devices/api';
import {
  computeDefaultWorkPathOptions,
  generateWorkPath,
  type WorkPathOptions,
} from '@features/vehicles/utils/generateWorkPath';
import {
  deviceTypeLabel,
  deviceTypeToVehicleType,
  getDeviceSpeedKmh,
  getVehicleTypeMeta,
  isAutomatedVehicleDevice,
  VehicleTypeIcon,
} from '@features/vehicles/utils/vehicleDisplay';
import { Modal } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';
import { WorkPathPreview } from './WorkPathPreview';

type CreateAutomatedJobModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  landName: string;
  landCoords: [number, number][];
  automatedDevices: DbDevice[];
  busyDevices?: BusyAutomatedDevice[];
  isPending?: boolean;
  onSubmit: (data: {
    title: string;
    description?: string;
    deviceId: string;
    workPath: [number, number][];
    pathOptions: WorkPathOptions;
  }) => void;
};

function deviceBatteryPercent(device: DbDevice): number | null {
  if (
    device.config !== null &&
    typeof device.config === 'object' &&
    !Array.isArray(device.config) &&
    typeof (device.config as Record<string, unknown>).battery_percent ===
      'number'
  ) {
    return (device.config as Record<string, unknown>).battery_percent as number;
  }
  return null;
}

const BUSY_STATUS_LABEL: Record<BusyAutomatedDevice['status'], string> = {
  queued: 'รอคิว',
  working: 'กำลังทำงาน',
  paused: 'หยุดชั่วคราว',
  completed: 'เสร็จแล้ว',
  cancelled: 'ยกเลิก',
};

type PathSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
};

function PathSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: PathSliderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Row className="items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </label>
        <span className="text-xs font-medium text-gray-700 tabular-nums">
          {value}
          {unit}
        </span>
      </Row>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#03662c]"
      />
      <Row className="justify-between text-[10px] text-gray-400 tabular-nums">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </Row>
    </div>
  );
}

export function CreateAutomatedJobModal({
  isOpen,
  onOpenChange,
  landName,
  landCoords,
  automatedDevices,
  busyDevices = [],
  isPending,
  onSubmit,
}: CreateAutomatedJobModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [pathOptions, setPathOptions] = useState<WorkPathOptions>(() =>
    computeDefaultWorkPathOptions(landCoords),
  );

  const vehicles = useMemo(
    () => automatedDevices.filter(isAutomatedVehicleDevice),
    [automatedDevices],
  );

  const busyByDeviceId = useMemo(() => {
    const map = new Map<string, BusyAutomatedDevice>();
    for (const item of busyDevices) {
      map.set(item.deviceId, item);
    }
    return map;
  }, [busyDevices]);

  const availableVehicles = useMemo(
    () => vehicles.filter((device) => !busyByDeviceId.has(device.id)),
    [vehicles, busyByDeviceId],
  );

  const workPath = useMemo(
    () => generateWorkPath(landCoords, pathOptions),
    [landCoords, pathOptions],
  );
  const pathPointCount = workPath.length;

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDescription('');
    setDeviceId(availableVehicles[0]?.id ?? '');
    setTitleError(false);
    setPathOptions(computeDefaultWorkPathOptions(landCoords));
  }, [isOpen, availableVehicles, landCoords]);

  const handleClose = () => onOpenChange(false);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError(true);
      return;
    }
    if (!deviceId || busyByDeviceId.has(deviceId) || pathPointCount < 2) return;
    setTitleError(false);
    onSubmit({
      title: trimmed,
      description: description.trim() || undefined,
      deviceId,
      workPath,
      pathOptions,
    });
  };

  const canSubmit =
    !!title.trim() &&
    !!deviceId &&
    !busyByDeviceId.has(deviceId) &&
    pathPointCount >= 2 &&
    !isPending;

  const updatePathOption = <K extends keyof WorkPathOptions>(
    key: K,
    value: WorkPathOptions[K],
  ) => {
    setPathOptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={handleClose}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg bg-white text-gray-800 border border-gray-200 shadow-2xl">
            <Modal.CloseTrigger className="hover:bg-gray-100" />
            <Modal.Header className="border-b border-gray-100">
              <div className="flex flex-col gap-0.5">
                <Modal.Heading className="font-bold uppercase tracking-wider text-gray-800">
                  สร้างงานอัตโนมัติ
                </Modal.Heading>
                <p className="text-xs text-gray-400">{landName}</p>
              </div>
            </Modal.Header>

            <Modal.Body className="pb-6 flex flex-col gap-5 max-h-[70dvh] overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  ชื่องาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น ไถพร่นแปลง, สำรวจแปลงจากอากาศ"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError(false);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:bg-white transition-all ${titleError ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-gray-200 bg-gray-50 focus:border-[#03662c]'}`}
                />
                {titleError && (
                  <p className="text-xs text-red-500">กรุณากรอกชื่องาน</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  รายละเอียด
                </label>
                <textarea
                  placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#03662c] focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  เลือกยานพาหนะ <span className="text-red-500">*</span>
                </label>
                {vehicles.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    ยังไม่มียานพาหนะในฟาร์มนี้ — เพิ่มอุปกรณ์ประเภท tractor หรือ drone ใน
                    farm_devices ก่อน
                  </p>
                ) : availableVehicles.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    ยานพาหนะทุกคันกำลังถูกใช้งานอยู่ — รอให้งานปัจจุบันเสร็จก่อนสร้างงานใหม่
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {vehicles.map((device) => {
                      const busy = busyByDeviceId.get(device.id);
                      const isBusy = !!busy;
                      const selected = deviceId === device.id;
                      const battery = deviceBatteryPercent(device);
                      const vehicleType = deviceTypeToVehicleType(
                        device.device_type,
                      );
                      const meta = getVehicleTypeMeta(vehicleType);
                      const speedKmh = getDeviceSpeedKmh(device);

                      return (
                        <button
                          key={device.id}
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            if (!isBusy) setDeviceId(device.id);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                            isBusy
                              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-70'
                              : selected
                                ? 'border-[#03662c] bg-[#03662c]/5 text-[#03662c] font-semibold'
                                : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white hover:border-gray-300'
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isBusy ? 'bg-gray-200' : meta.accentLight}`}
                          >
                            <VehicleTypeIcon
                              type={vehicleType}
                              size={16}
                              className={
                                isBusy ? 'text-gray-400' : meta.listIcon
                              }
                            />
                          </span>
                          <Column className="gap-0 min-w-0 flex-1">
                            <span className="truncate">{device.name}</span>
                            <span
                              className={`text-[11px] font-normal ${isBusy ? 'text-gray-400' : 'text-gray-500'}`}
                            >
                              {isBusy ? (
                                <>
                                  กำลังใช้งาน · {BUSY_STATUS_LABEL[busy.status]} ·{' '}
                                  {busy.jobTitle}
                                </>
                              ) : (
                                <>
                                  {deviceTypeLabel(device.device_type)}
                                  {battery !== null && ` · แบตเตอรี่ ${battery}%`}
                                  {` · ${speedKmh} km/h`}
                                </>
                              )}
                            </span>
                          </Column>
                          {selected && !isBusy && (
                            <span className="text-[#03662c]">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-emerald-900">
                    กำหนดเส้นทาง
                  </span>
                  <span className="text-xs text-emerald-800/75">
                    ปรับมุม ระยะห่าง และ margin แล้วดูตัวอย่างด้านล่าง
                  </span>
                </div>

                <PathSlider
                  label="มุมเส้นทาง"
                  value={pathOptions.angleDeg}
                  min={0}
                  max={359}
                  step={1}
                  unit="°"
                  onChange={(value) => updatePathOption('angleDeg', value)}
                />
                <PathSlider
                  label="ระยะห่างรอบ"
                  value={pathOptions.spacingM}
                  min={2}
                  max={30}
                  step={0.5}
                  unit=" ม."
                  onChange={(value) => updatePathOption('spacingM', value)}
                />
                <PathSlider
                  label="Margin ขอบแปลง"
                  value={pathOptions.marginM}
                  min={0}
                  max={15}
                  step={0.5}
                  unit=" ม."
                  onChange={(value) => updatePathOption('marginM', value)}
                />

                <WorkPathPreview
                  landCoords={landCoords}
                  workPath={workPath}
                  marginM={pathOptions.marginM}
                />
              </div>
            </Modal.Body>

            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-white bg-[#03662c] hover:bg-[#03662c]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-[#03662c]/30 flex items-center gap-2"
              >
                {isPending && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {isPending ? 'กำลังสร้าง...' : 'สร้างงาน'}
              </button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
