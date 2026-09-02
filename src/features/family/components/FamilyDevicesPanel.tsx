import { Column, Row } from '@app/layout';
import {
  buildPermissionStateFromFamily,
  mergeFamilyDevices,
  useFamilyDashboardQuery,
  useFamilyMutations,
} from '@features/family/hooks';
import {
  FamilySharePermission,
  isOwnerEffective,
  sharedCameraPermissions,
  sharedIotPermissions,
} from '@features/family/types';
import {
  useIOTDevicesQuery,
  useKasetkornCamerasQuery,
} from '@features/dashboard/hooks';
import { Button, Checkbox, Chip, Separator } from '@heroui/react';
import type { SidebarNavAPI } from '@shared/ui/SidebarNav';
import { CctvIcon, CpuIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FamilyPanelHeader } from './FamilyScreen';

function PermissionChips({
  value,
  onChange,
  disabled,
}: {
  value: FamilySharePermission;
  onChange: (perm: FamilySharePermission) => void;
  disabled?: boolean;
}) {
  return (
    <Row className="gap-1">
      {(['view', 'control'] as const).map((perm) => (
        <button
          key={perm}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(perm)}
          className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-colors ${
            value === perm
              ? 'bg-emerald-600 text-white'
              : 'bg-black/6 text-gray-600 hover:bg-black/10'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {perm === 'view' ? 'ดู' : 'ควบคุม'}
        </button>
      ))}
    </Row>
  );
}

export function FamilyDevicesPanel({ nav }: { nav: SidebarNavAPI }) {
  const { data: snapshot, appFarmerId } = useFamilyDashboardQuery();
  const family = snapshot?.family ?? null;
  const isOwner = isOwnerEffective(family, appFarmerId);
  const { data: iotList = [] } = useIOTDevicesQuery();
  const { data: cameraList = [] } = useKasetkornCamerasQuery(true);
  const { syncDevicesMutation } = useFamilyMutations(appFarmerId);

  const [iotPerms, setIotPerms] = useState<Map<string, FamilySharePermission>>(
    () => new Map(),
  );
  const [camPerms, setCamPerms] = useState<Map<string, FamilySharePermission>>(
    () => new Map(),
  );
  const [synced, setSynced] = useState(false);
  const persistChain = useRef(Promise.resolve());

  useEffect(() => {
    if (!family || synced) return;
    const state = buildPermissionStateFromFamily(family);
    setIotPerms(new Map(state.iot));
    setCamPerms(new Map(state.camera));
    setSynced(true);
  }, [family, synced]);

  const devices = family
    ? mergeFamilyDevices(family, iotList, cameraList, true)
    : { iotRows: [], cameraRows: [] };

  const enqueuePersist = useCallback(
    (nextIot: Map<string, FamilySharePermission>, nextCam: Map<string, FamilySharePermission>) => {
      if (!family?.familyId || !isOwner) return;

      const ownedIotIds = new Set(
        devices.iotRows.filter((r) => r.isOwner).map((r) => r.id),
      );
      const ownedCamIds = new Set(
        devices.cameraRows.filter((r) => r.isOwner).map((r) => r.id),
      );

      const prevIot = sharedIotPermissions(family);
      const prevCam = sharedCameraPermissions(family);

      const mergedIot = new Map<string, string>();
      const mergedCam = new Map<string, string>();

      for (const [k, v] of prevIot) {
        if (!ownedIotIds.has(k)) mergedIot.set(k, v);
      }
      for (const [k, v] of nextIot) {
        if (ownedIotIds.has(k)) mergedIot.set(k, v);
      }
      for (const [k, v] of prevCam) {
        if (!ownedCamIds.has(k)) mergedCam.set(k, v);
      }
      for (const [k, v] of nextCam) {
        if (ownedCamIds.has(k)) mergedCam.set(k, v);
      }

      persistChain.current = persistChain.current.then(() =>
        syncDevicesMutation.mutateAsync({
          familyId: family.familyId!,
          prevIotPerms: prevIot,
          prevCamPerms: prevCam,
          nextIotPerms: mergedIot,
          nextCamPerms: mergedCam,
          managedIotIds: ownedIotIds,
          managedCameraIds: ownedCamIds,
        }),
      );
    },
    [devices, family, isOwner, syncDevicesMutation],
  );

  const toggleIot = (id: string, isDeviceOwner: boolean) => {
    if (!isDeviceOwner) return;
    setSynced(true);
    setIotPerms((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, FamilySharePermission.view);
      enqueuePersist(next, camPerms);
      return next;
    });
  };

  const toggleCam = (id: string, isDeviceOwner: boolean) => {
    if (!isDeviceOwner) return;
    setSynced(true);
    setCamPerms((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, FamilySharePermission.view);
      enqueuePersist(iotPerms, next);
      return next;
    });
  };

  const setIotPerm = (id: string, perm: FamilySharePermission) => {
    setIotPerms((prev) => {
      const next = new Map(prev);
      next.set(id, perm);
      enqueuePersist(next, camPerms);
      return next;
    });
  };

  const setCamPerm = (id: string, perm: FamilySharePermission) => {
    setCamPerms((prev) => {
      const next = new Map(prev);
      next.set(id, perm);
      enqueuePersist(iotPerms, next);
      return next;
    });
  };

  if (!family?.familyId) {
    return (
      <Column className="p-6 items-center">
        <span className="text-sm text-gray-400">ไม่พบครอบครัว</span>
        <Button variant="ghost" className="mt-2" onPress={() => nav.pop()}>
          กลับ
        </Button>
      </Column>
    );
  }

  return (
    <Column className="pb-4 max-h-[calc(90vh)] overflow-y-auto">
      <FamilyPanelHeader
        title="แชร์อุปกรณ์กับครอบครัว"
        onBack={() => nav.pop()}
      />

      <p className="px-4 text-xs text-gray-500 mb-2">
        {isOwner
          ? 'เลือกอุปกรณ์ที่ต้องการแชร์และกำหนดสิทธิ์'
          : 'รายการอุปกรณ์ที่แชร์ในครอบครัวนี้'}
      </p>

      <Row className="px-4 items-center gap-2 mb-1">
        <CpuIcon className="size-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-800">เซ็นเซอร์</span>
        <Chip size="sm" variant="soft">
          {devices.iotRows.length}
        </Chip>
      </Row>

      <Column className="px-3 gap-1 mb-3">
        {devices.iotRows.length === 0 ? (
          <span className="text-sm text-gray-400 px-3 py-4 text-center">
            ไม่มีเซ็นเซอร์
          </span>
        ) : (
          devices.iotRows.map((row) => {
            const shared = iotPerms.has(row.id);
            const perm = iotPerms.get(row.id) ?? FamilySharePermission.view;
            return (
              <Row
                key={row.id}
                className="items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-black/4"
              >
                {isOwner && row.isOwner ? (
                  <Checkbox
                    isSelected={shared}
                    onChange={() => toggleIot(row.id, row.isOwner)}
                  />
                ) : (
                  <span className="w-5" />
                )}
                <Column className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {row.displayName}
                  </span>
                  {row.location && (
                    <span className="text-xs text-gray-500 truncate">
                      {row.location}
                    </span>
                  )}
                </Column>
                {shared && (
                  <PermissionChips
                    value={perm}
                    onChange={(p) => setIotPerm(row.id, p)}
                    disabled={!isOwner || !row.isOwner}
                  />
                )}
              </Row>
            );
          })
        )}
      </Column>

      <Separator className="my-1" />

      <Row className="px-4 items-center gap-2 mb-1 mt-2">
        <CctvIcon className="size-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-800">กล้อง</span>
        <Chip size="sm" variant="soft">
          {devices.cameraRows.length}
        </Chip>
      </Row>

      <Column className="px-3 gap-1">
        {devices.cameraRows.length === 0 ? (
          <span className="text-sm text-gray-400 px-3 py-4 text-center">
            ไม่มีกล้อง
          </span>
        ) : (
          devices.cameraRows.map((row) => {
            const shared = camPerms.has(row.id);
            const perm = camPerms.get(row.id) ?? FamilySharePermission.view;
            return (
              <Row
                key={row.id}
                className="items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-black/4"
              >
                {isOwner && row.isOwner ? (
                  <Checkbox
                    isSelected={shared}
                    onChange={() => toggleCam(row.id, row.isOwner)}
                  />
                ) : (
                  <span className="w-5" />
                )}
                <Column className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {row.displayName}
                  </span>
                  {row.location && (
                    <span className="text-xs text-gray-500 truncate">
                      {row.location}
                    </span>
                  )}
                </Column>
                {shared && (
                  <PermissionChips
                    value={perm}
                    onChange={(p) => setCamPerm(row.id, p)}
                    disabled={!isOwner || !row.isOwner}
                  />
                )}
              </Row>
            );
          })
        )}
      </Column>

      {syncDevicesMutation.isPending && (
        <span className="text-xs text-gray-400 text-center py-2">
          กำลังบันทึก...
        </span>
      )}
    </Column>
  );
}
