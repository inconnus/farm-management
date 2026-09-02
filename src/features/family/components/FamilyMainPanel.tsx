import { Column, Row } from '@app/layout';
import {
  useFamilyDashboardQuery,
  useFamilyMutations,
  useOutgoingInvitesQuery,
} from '@features/family/hooks';
import {
  familyMemberDisplayName,
  isOwnerEffective,
} from '@features/family/types';
import {
  Button,
  Input,
  Label,
  Modal,
  Separator,
  TextField,
} from '@heroui/react';
import type { SidebarNavAPI } from '@shared/ui/SidebarNav';
import {
  ChevronRight,
  CpuIcon,
  Trash2Icon,
  UserMinusIcon,
  UsersIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { FamilyPanelHeader, UserPlusIcon } from './FamilyScreen';

function FamilyNameModal({
  isOpen,
  onOpenChange,
  title,
  confirmLabel,
  initialValue = '',
  onConfirm,
  isPending,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  initialValue?: string;
  onConfirm: (name: string) => void;
  isPending?: boolean;
}) {
  const [name, setName] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setName(initialValue);
  }, [isOpen, initialValue]);

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="max-w-sm">
          <Modal.Header>
            <Modal.Heading>{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <TextField
              value={name}
              onChange={setName}
              isRequired
              autoFocus
            >
              <Label>ชื่อครอบครัว</Label>
              <Input placeholder="เช่น ครอบครัวที่สวนใหญ่" />
            </TextField>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" slot="close">
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              isDisabled={!name.trim() || isPending}
              onPress={() => {
                onConfirm(name.trim());
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function ConfirmModal({
  isOpen,
  onOpenChange,
  title,
  message,
  confirmLabel,
  onConfirm,
  isPending,
  destructive,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  isPending?: boolean;
  destructive?: boolean;
}) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="max-w-sm">
          <Modal.Header>
            <Modal.Heading>{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-gray-600">{message}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" slot="close">
              ยกเลิก
            </Button>
            <Button
              variant={destructive ? 'danger' : 'primary'}
              isDisabled={isPending}
              onPress={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

export function FamilyMainPanel({ nav }: { nav: SidebarNavAPI }) {
  const {
    data: snapshot,
    isLoading,
    appFarmerId,
    setFocusedFamilyId,
  } = useFamilyDashboardQuery({ refetchInterval: 5_000 });
  const family = snapshot?.family ?? null;
  const members = snapshot?.members ?? [];
  const allFamilies = snapshot?.allFamilies ?? [];
  const isOwner = isOwnerEffective(family, appFarmerId);
  const sharedCount = family?.devices.length ?? 0;

  const {
    createFamilyMutation,
    updateFamilyMutation,
    deleteFamilyMutation,
    removeMemberMutation,
    rejectInviteMutation,
  } = useFamilyMutations(appFarmerId);

  const { data: outgoingInvites = [] } = useOutgoingInvitesQuery(
    family?.familyId,
    isOwner,
    { refetchInterval: 5_000 },
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);

  if (isLoading) {
    return (
      <Column className="p-6 items-center">
        <span className="text-sm text-gray-400">กำลังโหลด...</span>
      </Column>
    );
  }

  if (!family?.familyId) {
    return (
      <Column className="p-4 gap-4">
        <FamilyPanelHeader title="ครอบครัวของฉัน" />
        <Column className="items-center gap-3 py-8 px-4 text-center">
          <UsersIcon className="size-12 text-gray-300" />
          <span className="text-base font-semibold text-gray-800">
            ยังไม่มีครอบครัว
          </span>
          <span className="text-sm text-gray-500">
            สร้างครอบครัวเพื่อแชร์เซ็นเซอร์และกล้องกับคนที่คุณไว้ใจ
          </span>
          <Button
            variant="primary"
            className="mt-2"
            onPress={() => setCreateOpen(true)}
          >
            สร้างครอบครัวของฉัน
          </Button>
        </Column>
        <FamilyNameModal
          isOpen={createOpen}
          onOpenChange={setCreateOpen}
          title="ตั้งชื่อครอบครัว"
          confirmLabel="สร้าง"
          onConfirm={(name) => createFamilyMutation.mutate(name)}
          isPending={createFamilyMutation.isPending}
        />
      </Column>
    );
  }

  return (
    <Column className="pb-4 max-h-[calc(90vh)] overflow-y-auto">
      <FamilyPanelHeader title="ครอบครัวของฉัน" />

      <button
        type="button"
        className="mx-3 mt-2 p-4 rounded-2xl bg-black/4 hover:bg-black/6 text-left transition-colors"
        onClick={() => allFamilies.length > 1 && setSwitchOpen(true)}
      >
        <Row className="items-center justify-between">
          <Column className="gap-0.5">
            <span className="text-base font-semibold text-gray-900">
              {family.familyName || 'ครอบครัว'}
            </span>
            <span className="text-xs text-gray-500">
              {isOwner ? 'เจ้าของ' : 'สมาชิก'} · {members.length} สมาชิก · แชร์{' '}
              {sharedCount} อุปกรณ์
            </span>
          </Column>
          {allFamilies.length > 1 && (
            <ChevronRight className="size-4 text-gray-400" />
          )}
        </Row>
      </button>

      <Separator className="my-3" />

      <Row className="px-4 items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          สมาชิก
        </span>
        {isOwner && (
          <Button
            size="sm"
            variant="ghost"
            onPress={() => nav.push('invite')}
          >
            <UserPlusIcon className="size-3.5" />
            เชิญสมาชิก
          </Button>
        )}
      </Row>

      <Column className="px-3 gap-1">
        {members.map((member) => (
          <Row
            key={member.appFarmerId}
            className="items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/4"
          >
            <div className="size-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium shrink-0">
              {familyMemberDisplayName(member).slice(0, 1)}
            </div>
            <Column className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate">
                {familyMemberDisplayName(member)}
              </span>
              {member.mobileNo && (
                <span className="text-xs text-gray-500">{member.mobileNo}</span>
              )}
            </Column>
            {isOwner &&
              member.appFarmerId &&
              member.appFarmerId !== appFarmerId && (
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label="ลบสมาชิก"
                  onPress={() =>
                    family.familyId &&
                    removeMemberMutation.mutate({
                      familyId: family.familyId,
                      memberFarmerId: member.appFarmerId!,
                    })
                  }
                >
                  <UserMinusIcon className="size-4 text-red-500" />
                </Button>
              )}
          </Row>
        ))}

        {isOwner &&
          outgoingInvites.map((inv) => (
            <Row
              key={inv.inviteId}
              className="items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100"
            >
              <Column className="flex-1 min-w-0">
                <span className="text-sm text-gray-800">
                  {inv.memberName?.trim() || 'รอการยืนยัน'}
                </span>
                <span className="text-xs text-amber-700">รอยืนยัน</span>
              </Column>
              <Button
                size="sm"
                variant="ghost"
                onPress={() =>
                  inv.inviteId &&
                  inv.memberFarmerId &&
                  rejectInviteMutation.mutate({
                    inviteId: inv.inviteId,
                    memberFarmerId: inv.memberFarmerId,
                  })
                }
              >
                ยกเลิก
              </Button>
            </Row>
          ))}
      </Column>

      <Separator className="my-3" />

      <span className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        การจัดการ
      </span>

      <Column className="px-3 gap-1">
        <button
          type="button"
          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-black/4 text-left w-full"
          onClick={() => nav.push('devices')}
        >
          <CpuIcon className="size-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900 flex-1">
            อุปกรณ์ที่แชร์
          </span>
          <ChevronRight className="size-4 text-gray-400" />
        </button>

        {isOwner ? (
          <>
            <button
              type="button"
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-black/4 text-left w-full"
              onClick={() => setRenameOpen(true)}
            >
              <span className="text-sm text-gray-700 flex-1 pl-7">
                เปลี่ยนชื่อครอบครัว
              </span>
            </button>
            <button
              type="button"
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 text-left w-full"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon className="size-4 text-red-500 ml-3" />
              <span className="text-sm text-red-600 flex-1">ลบครอบครัว</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 text-left w-full"
            onClick={() => setLeaveOpen(true)}
          >
            <UserMinusIcon className="size-4 text-red-500 ml-3" />
            <span className="text-sm text-red-600 flex-1">ออกจากครอบครัว</span>
          </button>
        )}
      </Column>

      <FamilyNameModal
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        title="ตั้งชื่อครอบครัว"
        confirmLabel="สร้าง"
        onConfirm={(name) => createFamilyMutation.mutate(name)}
        isPending={createFamilyMutation.isPending}
      />

      <FamilyNameModal
        isOpen={renameOpen}
        onOpenChange={setRenameOpen}
        title="เปลี่ยนชื่อครอบครัว"
        confirmLabel="บันทึก"
        initialValue={family.familyName ?? ''}
        onConfirm={(name) =>
          family.familyId &&
          updateFamilyMutation.mutate({ familyId: family.familyId, familyName: name })
        }
        isPending={updateFamilyMutation.isPending}
      />

      <ConfirmModal
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="ยุบครอบครัว?"
        message="สมาชิกจะถูกนำออกจากกลุ่มนี้ และการแชร์อุปกรณ์จะถูกยกเลิกตามระบบ"
        confirmLabel="ลบครอบครัว"
        destructive
        isPending={deleteFamilyMutation.isPending}
        onConfirm={() => family.familyId && deleteFamilyMutation.mutate(family.familyId)}
      />

      <ConfirmModal
        isOpen={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="ออกจากครอบครัว?"
        message="คุณจะไม่สามารถเข้าถึงอุปกรณ์ที่แชร์จากครอบครัวนี้ได้อีก"
        confirmLabel="ออกจากครอบครัว"
        destructive
        isPending={removeMemberMutation.isPending}
        onConfirm={() =>
          family.familyId &&
          appFarmerId &&
          removeMemberMutation.mutate({
            familyId: family.familyId,
            memberFarmerId: appFarmerId,
          })
        }
      />

      <Modal.Backdrop isOpen={switchOpen} onOpenChange={setSwitchOpen}>
        <Modal.Container>
          <Modal.Dialog className="max-w-sm">
            <Modal.Header>
              <Modal.Heading>เลือกครอบครัว</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Column className="gap-1">
                {allFamilies.map((f) => (
                  <button
                    key={f.familyId}
                    type="button"
                    className={`text-left px-3 py-2.5 rounded-xl hover:bg-black/5 ${
                      f.familyId === family.familyId ? 'bg-black/5' : ''
                    }`}
                    onClick={() => {
                      setFocusedFamilyId(f.familyId ?? null);
                      setSwitchOpen(false);
                    }}
                  >
                    <span className="text-sm font-medium">{f.familyName}</span>
                  </button>
                ))}
              </Column>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Column>
  );
}
