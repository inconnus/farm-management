import { Row } from '@app/layout';
import {
  fetchCameraToken,
  type KasetkornCamera,
} from '@features/dashboard/data/api';
import { useKasetkornCamerasQuery } from '@features/dashboard/hooks';
import { useCreateDeviceMutation } from '@features/devices/hooks/useCreateDeviceMutation';
import type { DbDevice } from '@features/devices/hooks/useDevicesQuery';
import { Modal } from '@heroui/react';
import {
  CctvIcon,
  CheckIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

function deviceInsertErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('row-level security')) {
    return 'ไม่มีสิทธิ์เพิ่มอุปกรณ์ — ต้องเป็นผู้ดูแลฟาร์ม (owner/manager) หรือ admin ขององค์กร';
  }
  return message;
}

type ImportCameraModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  existingDevices?: DbDevice[];
};

function collectImportedCameraKeys(
  devices: DbDevice[] | undefined,
): Set<string> {
  const ids = new Set<string>();
  for (const device of devices ?? []) {
    if (device.device_type !== 'camera') continue;
    const config = (device.config ?? {}) as Record<string, unknown>;
    for (const key of [
      'kasetkorn_id',
      'app_iot_id',
      'device_serial',
    ] as const) {
      const value = config[key];
      if (typeof value === 'string' && value.trim() !== '') ids.add(value);
    }
  }
  return ids;
}

function isCameraImported(
  cam: KasetkornCamera,
  importedKeys: Set<string>,
): boolean {
  return (
    importedKeys.has(cam._id) ||
    importedKeys.has(cam.appIotId) ||
    importedKeys.has(cam.deviceSerial)
  );
}

function cameraKeys(cam: KasetkornCamera): string[] {
  return [cam._id, cam.appIotId, cam.deviceSerial].filter(
    (value): value is string => typeof value === 'string' && value.trim() !== '',
  );
}

export function ImportCameraModal({
  isOpen,
  onOpenChange,
  farmId,
  existingDevices,
}: ImportCameraModalProps) {
  const [search, setSearch] = useState('');
  const [pendingCameraKeys, setPendingCameraKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const { data: cameras, isLoading } = useKasetkornCamerasQuery(isOpen);
  const {
    mutate: createDevice,
    isPending,
    error,
  } = useCreateDeviceMutation(farmId);

  const importedKeys = useMemo(
    () => collectImportedCameraKeys(existingDevices),
    [existingDevices],
  );

  const filteredCameras = useMemo(() => {
    if (!cameras) return [];
    const q = search.trim().toLowerCase();
    if (!q) return cameras;
    return cameras.filter(
      (c) =>
        (c.deviceName?.toLowerCase() || '').includes(q) ||
        (c.deviceSerial?.toLowerCase() || '').includes(q) ||
        (c.appIotId?.toLowerCase() || '').includes(q) ||
        (c.province?.toLowerCase() || '').includes(q) ||
        (c.amphur?.toLowerCase() || '').includes(q) ||
        (c.tambon?.toLowerCase() || '').includes(q),
    );
  }, [cameras, search]);

  const handleClose = () => {
    setSearch('');
    setPendingCameraKeys(new Set());
    onOpenChange(false);
  };

  const isCameraBusy = (cam: KasetkornCamera) =>
    cameraKeys(cam).some((key) => pendingCameraKeys.has(key));

  const handleImport = async (cam: KasetkornCamera) => {
    if (isCameraImported(cam, importedKeys) || isCameraBusy(cam)) return;

    const keys = cameraKeys(cam);
    setPendingCameraKeys((prev) => {
      const next = new Set(prev);
      for (const key of keys) next.add(key);
      return next;
    });

    let accessToken: string | undefined;
    try {
      accessToken = await fetchCameraToken();
    } catch {
      // Token is only needed for live video; import still succeeds without it.
    }

    createDevice(
      {
        name: cam.deviceName || cam.deviceSerial,
        deviceType: 'camera',
        lat: cam.lat,
        lng: cam.lon,
        config: {
          mode: 'hik',
          kasetkorn_id: cam._id,
          app_iot_id: cam.appIotId,
          device_serial: cam.deviceSerial,
          code: cam.validateCode,
          channel_no: 1,
          quality: 1,
          method: 2,
          tambon: cam.tambon,
          amphur: cam.amphur,
          province: cam.province,
          is_ptz: cam.isPTZ,
          ...(accessToken ? { access_token: accessToken } : {}),
        },
      },
      {
        onSuccess: handleClose,
        onError: () => {
          setPendingCameraKeys((prev) => {
            const next = new Set(prev);
            for (const key of keys) next.delete(key);
            return next;
          });
        },
      },
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
                เพิ่มกล้อง
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="pb-4 flex flex-col gap-3 max-h-[70dvh]">
              <p className="text-xs text-gray-500">
                ค้นหาและเลือกกล้องจาก Dashboard เพื่อนำเข้ามาในฟาร์มนี้
              </p>

              <Row className="items-center gap-2 bg-black/6 rounded-[10px] px-3 h-9 shrink-0">
                <SearchIcon size={14} className="text-gray-400 shrink-0" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  placeholder="ค้นหา (ชื่อ, Serial, จังหวัด)..."
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

                {!isLoading && filteredCameras.length === 0 && (
                  <p className="text-center text-gray-400 py-6 text-sm">
                    {search.trim() ? 'ไม่พบกล้องที่ค้นหา' : 'ไม่มีกล้องใน Dashboard'}
                  </p>
                )}

                {filteredCameras.map((cam) => {
                  const imported = isCameraImported(cam, importedKeys);
                  const isBusy = isCameraBusy(cam);

                  return (
                    <div
                      key={cam._id}
                      className={`rounded-xl border px-3 py-2.5 transition-colors ${
                        imported
                          ? 'border-gray-200 bg-gray-50 opacity-70'
                          : 'border-gray-200 hover:border-[#03662c]/40 hover:bg-[#03662c]/5'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-gray-100 border border-gray-200 relative">
                          <CctvIcon size={14} className="text-gray-600" />
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {cam.deviceName}
                            </span>
                            {imported && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 bg-gray-200 rounded-full px-1.5 py-0.5 shrink-0">
                                <CheckIcon size={10} />
                                นำเข้าแล้ว
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {cam.deviceSerial}
                            {cam.isPTZ ? ' · PTZ' : ''}
                          </p>

                          <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                            <MapPinIcon
                              size={10}
                              className="text-red-400 shrink-0"
                            />
                            <span className="truncate">
                              {[cam.tambon, cam.amphur, cam.province]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={imported || isPending || isBusy}
                          onClick={() => void handleImport(cam)}
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white bg-[#03662c] hover:bg-[#03662c]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <PlusIcon size={12} />
                          {isBusy ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
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
