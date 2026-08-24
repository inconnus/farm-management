import { Row } from '@app/layout';
import type { IOTDevice } from '@features/dashboard/data/api';
import {
  useIOTDevicesQuery,
  useIOTTelemetryQueries,
} from '@features/dashboard/hooks';
import { useCreateDeviceMutation } from '@features/devices/hooks/useCreateDeviceMutation';
import type { DbDevice } from '@features/devices/hooks/useDevicesQuery';
import { readAppIotId } from '@features/map/components/SensorMarker';
import { Modal } from '@heroui/react';
import {
  CheckIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  SproutIcon,
  ThermometerIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

function deviceInsertErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('row-level security')) {
    return 'ไม่มีสิทธิ์เพิ่มอุปกรณ์ — ต้องเป็นผู้ดูแลฟาร์ม (owner/manager) หรือ admin ขององค์กร';
  }
  return message;
}

type ImportSensorModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  existingDevices?: DbDevice[];
};

function collectImportedAppIotIds(
  devices: DbDevice[] | undefined,
): Set<string> {
  const ids = new Set<string>();
  for (const device of devices ?? []) {
    if (device.device_type !== 'sensor') continue;
    const appIotId = readAppIotId(device);
    if (appIotId) ids.add(appIotId);
  }
  return ids;
}

export function ImportSensorModal({
  isOpen,
  onOpenChange,
  farmId,
  existingDevices,
}: ImportSensorModalProps) {
  const [search, setSearch] = useState('');
  const { data: iotDevices, isLoading } = useIOTDevicesQuery();
  const {
    mutate: createDevice,
    isPending,
    error,
  } = useCreateDeviceMutation(farmId);

  const importedIds = useMemo(
    () => collectImportedAppIotIds(existingDevices),
    [existingDevices],
  );

  const filteredDevices = useMemo(() => {
    if (!iotDevices) return [];
    const q = search.trim().toLowerCase();
    if (!q) return iotDevices;
    return iotDevices.filter(
      (d) =>
        (d.appIotName?.toLowerCase() || '').includes(q) ||
        (d.appIotId?.toLowerCase() || '').includes(q) ||
        (d.province?.toLowerCase() || '').includes(q) ||
        (d.amphur?.toLowerCase() || '').includes(q) ||
        (d.tambon?.toLowerCase() || '').includes(q),
    );
  }, [iotDevices, search]);

  const appIotIds = useMemo(
    () => filteredDevices.map((d) => d.appIotId).filter(Boolean),
    [filteredDevices],
  );
  const telemetryQueries = useIOTTelemetryQueries(appIotIds, isOpen);
  const telemetryMap = useMemo(() => {
    const map = new Map<string, IOTDevice['telemetry']>();
    telemetryQueries.forEach((q) => {
      if (q.data?.appIotId && q.data.telemetry) {
        map.set(q.data.appIotId, q.data.telemetry);
      }
    });
    return map;
  }, [telemetryQueries]);

  const handleClose = () => {
    setSearch('');
    onOpenChange(false);
  };

  const handleImport = (device: IOTDevice) => {
    if (importedIds.has(device.appIotId)) return;
    createDevice(
      {
        name: device.appIotName || device.appIotId,
        deviceType: 'sensor',
        lat: device.lat,
        lng: device.lon,
        config: {
          app_iot_id: device.appIotId,
          kasetkorn_id: device._id,
          app_farm_id: device.appFarmId,
          app_farm_name: device.appFarmName,
          tambon: device.tambon,
          amphur: device.amphur,
          province: device.province,
        },
      },
      { onSuccess: handleClose },
    );
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={handleClose}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg bg-white text-gray-800 border border-gray-200 shadow-2xl">
            <Modal.CloseTrigger className="hover:bg-gray-100" />
            <Modal.Header className="border-b border-gray-100">
              <Modal.Heading className="font-bold uppercase tracking-wider text-gray-800">
                เพิ่มเสาร์เซ็นเซอร์
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="pb-4 flex flex-col gap-3 max-h-[70dvh]">
              <p className="text-xs text-gray-500">
                ค้นหาและเลือกเสาร์เซ็นเซอร์จาก Dashboard เพื่อนำเข้ามาในฟาร์มนี้
              </p>

              <Row className="items-center gap-2 bg-black/6 rounded-[10px] px-3 h-9 shrink-0">
                <SearchIcon size={14} className="text-gray-400 shrink-0" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  placeholder="ค้นหา (ชื่อ, ID, จังหวัด)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Row>

              {error && (
                <p className="text-xs text-red-500">
                  {deviceInsertErrorMessage(error)}
                </p>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-1 -mr-1">
                {isLoading && (
                  <p className="text-center text-gray-400 py-6 text-sm">
                    กำลังโหลด...
                  </p>
                )}

                {!isLoading && filteredDevices.length === 0 && (
                  <p className="text-center text-gray-400 py-6 text-sm">
                    {search.trim()
                      ? 'ไม่พบเสาร์เซ็นเซอร์ที่ค้นหา'
                      : 'ไม่มีเสาร์เซ็นเซอร์ใน Dashboard'}
                  </p>
                )}

                {filteredDevices.map((device) => {
                  const imported = importedIds.has(device.appIotId);
                  const telemetry =
                    telemetryMap.get(device.appIotId) || device.telemetry;

                  return (
                    <div
                      key={device._id}
                      className={`rounded-xl border px-3 py-2.5 transition-colors ${
                        imported
                          ? 'border-gray-200 bg-gray-50 opacity-70'
                          : 'border-gray-200 hover:border-[#03662c]/40 hover:bg-[#03662c]/5'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1 size-2 rounded-full shrink-0 ${
                            telemetry ? 'bg-green-500' : 'bg-red-400'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {device.appIotName}
                            </span>
                            {imported && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 bg-gray-200 rounded-full px-1.5 py-0.5 shrink-0">
                                <CheckIcon size={10} />
                                นำเข้าแล้ว
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {device.appIotId}
                          </p>

                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            <span className="inline-flex items-center gap-1 bg-[#03a9f4]/10 text-[#0288d1] rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                              <ThermometerIcon size={10} />
                              {telemetry?.sensor_ambient_temperature?.toFixed(
                                1,
                              ) ?? '-'}
                              °C
                            </span>
                            <span className="inline-flex items-center gap-1 bg-[#4caf50]/10 text-[#2e7d32] rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                              <SproutIcon size={10} />
                              {telemetry?.sensor_soil_humid_humid?.toFixed(1) ??
                                '-'}
                              %
                            </span>
                          </div>

                          <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                            <MapPinIcon
                              size={10}
                              className="text-red-400 shrink-0"
                            />
                            <span className="truncate">
                              {[device.tambon, device.amphur, device.province]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={imported || isPending}
                          onClick={() => handleImport(device)}
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white bg-[#03662c] hover:bg-[#03662c]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <PlusIcon size={12} />
                          เพิ่ม
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
