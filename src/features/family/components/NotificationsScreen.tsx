import { Column, Row } from '@app/layout';
import { useAppBasePath } from '@features/auth/hooks/useAppBasePath';
import {
  useFamilyMutations,
  useIncomingInvitesQuery,
} from '@features/family/hooks';
import { Button, Chip, Separator } from '@heroui/react';
import { SidebarNav } from '@shared/ui/SidebarNav';
import { BellIcon, CheckIcon, MailIcon, XIcon } from 'lucide-react';
import { useMemo } from 'react';
import { FamilyPanelHeader } from './FamilyScreen';

function NotificationsPanel() {
  const { data: invites = [], appFarmerId, isLoading } =
    useIncomingInvitesQuery({ refetchInterval: 5_000 });
  const { acceptInviteMutation, rejectInviteMutation } =
    useFamilyMutations(appFarmerId);

  return (
    <Column className="pb-4 max-h-[calc(90vh)] overflow-y-auto">
      <FamilyPanelHeader title="แจ้งเตือน" />

      <Row className="px-4 items-center gap-2 mb-2">
        <BellIcon className="size-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-800">
          คำเชิญที่ได้รับ
        </span>
        {invites.length > 0 && (
          <Chip size="sm" variant="soft" color="warning">
            {invites.length}
          </Chip>
        )}
      </Row>

      <Column className="px-3 gap-2">
        {isLoading ? (
          <span className="text-sm text-gray-400 text-center py-8">
            กำลังโหลด...
          </span>
        ) : invites.length === 0 ? (
          <Column className="items-center gap-3 py-10 px-4 text-center">
            <MailIcon className="size-12 text-gray-300" />
            <span className="text-base font-semibold text-gray-800">
              ไม่มีคำเชิญ
            </span>
            <span className="text-sm text-gray-500">
              เมื่อมีคนเชิญคุณเข้าครอบครัว จะแสดงที่นี่
            </span>
          </Column>
        ) : (
          invites.map((inv) => (
            <div
              key={inv.inviteId}
              className="rounded-2xl border border-orange-100 bg-[#FFF8E6] p-3"
            >
              <Row className="items-start gap-2">
                <div className="rounded-xl bg-orange-100 p-2 shrink-0">
                  <MailIcon className="size-4 text-orange-700" />
                </div>
                <Column className="flex-1 min-w-0 gap-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {inv.familyName?.trim() || 'ครอบครัว'}
                  </span>
                  {inv.ownerName && (
                    <span className="text-xs text-gray-600">
                      เชิญโดย {inv.ownerName}
                    </span>
                  )}
                  <Row className="gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1"
                      isDisabled={
                        !inv.inviteId ||
                        !appFarmerId ||
                        acceptInviteMutation.isPending
                      }
                      onPress={() =>
                        inv.inviteId &&
                        acceptInviteMutation.mutate(inv.inviteId)
                      }
                    >
                      <CheckIcon className="size-3.5" />
                      ยอมรับ
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      isDisabled={
                        !inv.inviteId ||
                        !appFarmerId ||
                        rejectInviteMutation.isPending
                      }
                      onPress={() =>
                        inv.inviteId &&
                        appFarmerId &&
                        rejectInviteMutation.mutate({
                          inviteId: inv.inviteId,
                          memberFarmerId: inv.memberFarmerId ?? appFarmerId,
                        })
                      }
                    >
                      <XIcon className="size-3.5" />
                      ปฏิเสธ
                    </Button>
                  </Row>
                </Column>
              </Row>
            </div>
          ))
        )}
      </Column>

      {invites.length > 0 && <Separator className="my-3 mx-3" />}
    </Column>
  );
}

export function NotificationsScreen() {
  const basePath = useAppBasePath();
  const notificationsPath = `${basePath}/notifications`;

  const pages = useMemo(
    () => [
      {
        key: 'list',
        path: '',
        render: () => <NotificationsPanel />,
      },
    ],
    [],
  );

  return (
    <SidebarNav
      basePath={notificationsPath}
      pages={pages}
      className="w-[420px]"
    />
  );
}
