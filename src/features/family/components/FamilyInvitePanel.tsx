import { Column, Row } from '@app/layout';
import {
  useFamilyDashboardQuery,
  useFamilyMutations,
} from '@features/family/hooks';
import { farmerSearchDisplayName } from '@features/family/types';
import { Button, Input, Label, TextField } from '@heroui/react';
import type { SidebarNavAPI } from '@shared/ui/SidebarNav';
import { SearchIcon, UserSearchIcon } from 'lucide-react';
import { useState } from 'react';
import { FamilyPanelHeader } from './FamilyScreen';

export function FamilyInvitePanel({ nav }: { nav: SidebarNavAPI }) {
  const { data: snapshot, appFarmerId } = useFamilyDashboardQuery();
  const familyId = snapshot?.family?.familyId;
  const { searchFarmerMutation, sendInviteMutation } =
    useFamilyMutations(appFarmerId);

  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    const q = phone.trim();
    if (!q) return;
    setSearched(false);
    searchFarmerMutation.mutate(q, {
      onSettled: () => setSearched(true),
    });
  };

  const found = searchFarmerMutation.data;
  const notFound = searched && !found && !searchFarmerMutation.isPending;

  return (
    <Column className="pb-4">
      <FamilyPanelHeader title="เชิญสมาชิก" onBack={() => nav.pop()} />

      <Column className="px-4 gap-3">
        <p className="text-sm text-gray-500">
          ค้นหาด้วยเบอร์โทรศัพท์ที่ลงทะเบียนในระบบเกษตรกร
        </p>

        <Row className="gap-2">
          <TextField
            value={phone}
            onChange={setPhone}
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          >
            <Label className="sr-only">เบอร์โทรศัพท์</Label>
            <Input placeholder="เบอร์โทรศัพท์" />
          </TextField>
          <Button
            variant="primary"
            isIconOnly
            aria-label="ค้นหา"
            isDisabled={!phone.trim() || searchFarmerMutation.isPending}
            onPress={handleSearch}
          >
            <SearchIcon className="size-4" />
          </Button>
        </Row>

        {searchFarmerMutation.isPending && (
          <span className="text-sm text-gray-400 text-center py-4">
            กำลังค้นหา...
          </span>
        )}

        {notFound && (
          <Column className="items-center gap-3 py-8 px-4 rounded-2xl bg-black/4 text-center">
            <UserSearchIcon className="size-12 text-gray-300" />
            <span className="text-base font-semibold text-gray-800">
              ไม่พบบัญชีจากเบอร์นี้
            </span>
            <span className="text-sm text-gray-500">
              ตรวจสอบว่าเบอร์ถูกต้อง และคนที่เชิญได้ลงทะเบียนในระบบแล้ว
            </span>
          </Column>
        )}

        {found && (
          <Column className="gap-3 p-4 rounded-2xl border border-gray-200 bg-white">
            <Row className="items-center gap-3">
              <div className="size-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-medium">
                {farmerSearchDisplayName(found).slice(0, 1)}
              </div>
              <Column>
                <span className="text-sm font-semibold text-gray-900">
                  {farmerSearchDisplayName(found)}
                </span>
                {found.mobileNo && (
                  <span className="text-xs text-gray-500">{found.mobileNo}</span>
                )}
              </Column>
            </Row>
            <Button
              variant="primary"
              className="w-full"
              isDisabled={
                !familyId ||
                !found.appFarmerId ||
                sendInviteMutation.isPending
              }
              onPress={() =>
                familyId &&
                found.appFarmerId &&
                sendInviteMutation.mutate(
                  { familyId, memberFarmerId: found.appFarmerId },
                  { onSuccess: () => nav.pop() },
                )
              }
            >
              ส่งคำเชิญ
            </Button>
          </Column>
        )}

        {sendInviteMutation.isError && (
          <span className="text-sm text-red-600 text-center">
            {(sendInviteMutation.error as Error).message}
          </span>
        )}
      </Column>
    </Column>
  );
}
