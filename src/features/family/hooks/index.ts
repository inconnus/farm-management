import { getKasetkornAuthContext } from '@features/auth/kasetkornAuth';
import { authModeAtom, pluksangSessionAtom } from '@features/auth/store';
import type { IOTDevice, KasetkornCamera } from '@features/dashboard/data/api';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useCallback, useState } from 'react';
import {
  acceptFamilyInvite,
  createFamily,
  deleteFamily,
  rejectFamilyInvite,
  removeFamilyMember,
  searchFarmerByPhone,
  sendFamilyInvite,
  syncSharedDevices,
  updateFamily,
} from '../api';
import { familyQueries } from '../queries';
import {
  type FamilyAllDevicesSnapshot,
  type FamilyShareCameraRow,
  type FamilyShareIotRow,
  type FamilySharePermission,
  familyInviteAwaitingResponse,
  sharedCameraPermissions,
  sharedIotPermissions,
} from '../types';

function useKasetkornAuth() {
  const authMode = useAtomValue(authModeAtom);
  const pluksangSession = useAtomValue(pluksangSessionAtom);
  return getKasetkornAuthContext(authMode, pluksangSession);
}

function useAppFarmerId() {
  const authMode = useAtomValue(authModeAtom);
  const pluksangSession = useAtomValue(pluksangSessionAtom);
  return authMode === 'pluksang' ? pluksangSession?.appFarmerId : undefined;
}

export function useFamilyDashboardQuery(options?: {
  refetchInterval?: number | false;
}) {
  const auth = useKasetkornAuth();
  const appFarmerId = useAppFarmerId();
  const [focusedFamilyId, setFocusedFamilyId] = useState<string | null>(null);

  const query = useQuery({
    ...familyQueries.dashboard(appFarmerId, auth, focusedFamilyId),
    refetchInterval: options?.refetchInterval ?? false,
    refetchIntervalInBackground: false,
  });

  return { ...query, focusedFamilyId, setFocusedFamilyId, appFarmerId, auth };
}

export function useIncomingInvitesQuery(options?: {
  /** Default 10s for sidebar badge; pass a lower value on the notifications page. */
  refetchInterval?: number | false;
}) {
  const auth = useKasetkornAuth();
  const appFarmerId = useAppFarmerId();
  const query = useQuery({
    ...familyQueries.incomingInvites(appFarmerId, auth),
    select: (data) =>
      data.filter((inv) => familyInviteAwaitingResponse(inv.status)),
    refetchInterval: options?.refetchInterval ?? 10_000,
    refetchIntervalInBackground: false,
  });
  return { ...query, appFarmerId, auth };
}

export function useOutgoingInvitesQuery(
  familyId: string | undefined,
  isOwner: boolean,
  options?: { refetchInterval?: number | false },
) {
  const auth = useKasetkornAuth();
  const query = useQuery({
    ...familyQueries.outgoingInvites(isOwner ? familyId : undefined, auth),
    select: (data) =>
      data.filter((inv) => familyInviteAwaitingResponse(inv.status)),
    refetchInterval: options?.refetchInterval ?? (isOwner ? 10_000 : false),
    refetchIntervalInBackground: false,
  });
  return query;
}

function invalidateFamilyQueries(
  qc: ReturnType<typeof useQueryClient>,
  appFarmerId?: string,
) {
  qc.invalidateQueries({ queryKey: ['family-dashboard'] });
  qc.invalidateQueries({ queryKey: ['family-incoming-invites'] });
  qc.invalidateQueries({ queryKey: ['family-outgoing-invites'] });
  qc.invalidateQueries({ queryKey: ['iot-devices'] });
  qc.invalidateQueries({ queryKey: ['kasetkorn-cameras'] });
  qc.invalidateQueries({ queryKey: ['kasetkorn-cameras-raw'] });
  if (appFarmerId) {
    qc.invalidateQueries({ queryKey: ['family-dashboard', appFarmerId] });
  }
}

export function useFamilyMutations(appFarmerId?: string) {
  const auth = useKasetkornAuth();
  const qc = useQueryClient();

  const invalidate = useCallback(
    () => invalidateFamilyQueries(qc, appFarmerId),
    [qc, appFarmerId],
  );

  const createFamilyMutation = useMutation({
    mutationFn: (familyName: string) =>
      createFamily(appFarmerId!, familyName, auth),
    onSuccess: invalidate,
  });

  const updateFamilyMutation = useMutation({
    mutationFn: ({ familyId, familyName }: { familyId: string; familyName: string }) =>
      updateFamily(familyId, familyName, auth),
    onSuccess: invalidate,
  });

  const deleteFamilyMutation = useMutation({
    mutationFn: (familyId: string) => deleteFamily(familyId, auth),
    onSuccess: invalidate,
  });

  const sendInviteMutation = useMutation({
    mutationFn: ({
      familyId,
      memberFarmerId,
    }: {
      familyId: string;
      memberFarmerId: string;
    }) => sendFamilyInvite(appFarmerId!, familyId, memberFarmerId, auth),
    onSuccess: invalidate,
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      acceptFamilyInvite(inviteId, appFarmerId!, auth),
    onSuccess: invalidate,
  });

  const rejectInviteMutation = useMutation({
    mutationFn: ({
      inviteId,
      memberFarmerId,
    }: {
      inviteId: string;
      memberFarmerId: string;
    }) => rejectFamilyInvite(inviteId, memberFarmerId, auth),
    onSuccess: invalidate,
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({
      familyId,
      memberFarmerId,
    }: {
      familyId: string;
      memberFarmerId: string;
    }) => removeFamilyMember(familyId, memberFarmerId, auth),
    onSuccess: invalidate,
  });

  const searchFarmerMutation = useMutation({
    mutationFn: (phone: string) => searchFarmerByPhone(phone, auth),
  });

  const syncDevicesMutation = useMutation({
    mutationFn: (args: {
      familyId: string;
      prevIotPerms: Map<string, string>;
      prevCamPerms: Map<string, string>;
      nextIotPerms: Map<string, string>;
      nextCamPerms: Map<string, string>;
      managedIotIds: Set<string>;
      managedCameraIds: Set<string>;
    }) =>
      syncSharedDevices(
        args.familyId,
        args.prevIotPerms,
        args.prevCamPerms,
        args.nextIotPerms,
        args.nextCamPerms,
        args.managedIotIds,
        args.managedCameraIds,
        auth,
      ),
    onSuccess: invalidate,
  });

  return {
    createFamilyMutation,
    updateFamilyMutation,
    deleteFamilyMutation,
    sendInviteMutation,
    acceptInviteMutation,
    rejectInviteMutation,
    removeMemberMutation,
    searchFarmerMutation,
    syncDevicesMutation,
  };
}

function locationParts(...parts: (string | undefined)[]): string {
  return parts.filter((p) => p?.trim()).join(' ');
}

export function mergeFamilyDevices(
  family: import('../types').FamilyModel,
  iotList: IOTDevice[],
  cameraList: KasetkornCamera[],
  includeOwned = true,
): FamilyAllDevicesSnapshot {
  const iotById = new Map<string, IOTDevice>();
  for (const d of iotList) {
    const id = d.appIotId;
    if (id) iotById.set(id, d);
  }

  const cameraById = new Map<string, KasetkornCamera>();
  for (const d of cameraList) {
    const id = d.appIotId;
    if (id) cameraById.set(id, d);
  }

  const familyIotIds = new Set<string>();
  const familyCamIds = new Set<string>();
  for (const d of family.devices) {
    const id = d.appIotId;
    if (!id) continue;
    const t = (d.type ?? '').toLowerCase();
    if (t === 'camera' || t === 'cctv') familyCamIds.add(id);
    else familyIotIds.add(id);
  }

  const iotRows: FamilyShareIotRow[] = [];
  const cameraRows: FamilyShareCameraRow[] = [];
  const seenIot = new Set<string>();
  const seenCam = new Set<string>();

  const addIot = (id: string) => {
    if (!id || seenIot.has(id)) return;
    seenIot.add(id);
    const iot = iotById.get(id);
    iotRows.push({
      id,
      displayName: iot?.appIotName?.trim() || 'ไม่มีชื่อ',
      location: locationParts(iot?.tambon, iot?.amphur, iot?.province),
      isOwner: iot?.isOwner === true,
      permission: sharedIotPermissions(family).get(id),
    });
  };

  const addCam = (id: string) => {
    if (!id || seenCam.has(id)) return;
    seenCam.add(id);
    const cam = cameraById.get(id);
    cameraRows.push({
      id,
      displayName: cam?.deviceName?.trim() || cam?.deviceSerial?.trim() || 'ไม่มีชื่อ',
      location: locationParts(cam?.tambon, cam?.amphur, cam?.province),
      isOwner: cam?.isOwner === true,
      permission: sharedCameraPermissions(family).get(id),
    });
  };

  for (const id of familyIotIds) addIot(id);
  for (const id of familyCamIds) addCam(id);

  if (includeOwned) {
    for (const iot of iotList) {
      if (iot.isOwner !== true) continue;
      addIot(iot.appIotId);
    }
    for (const cam of cameraList) {
      if (cam.isOwner !== true) continue;
      addCam(cam.appIotId);
    }
  }

  return { iotRows, cameraRows };
}

export type DevicePermissionState = {
  iot: Map<string, FamilySharePermission>;
  camera: Map<string, FamilySharePermission>;
};

export function buildPermissionStateFromFamily(
  family: import('../types').FamilyModel | null | undefined,
): DevicePermissionState {
  return {
    iot: sharedIotPermissions(family),
    camera: sharedCameraPermissions(family),
  };
}
