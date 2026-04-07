import React from 'react';
import {
  ListBox,
  Avatar,
  Label,
  Description,
  Separator,
  Button,
  Skeleton,
} from '@heroui/react';
import { House } from '@gravity-ui/icons';
import { HomeIcon, LandPlotIcon, LogOutIcon, SettingsIcon } from 'lucide-react';
import { Column, Row, Spacer } from '.';
import { useAtomValue } from 'jotai';
import { userAtom } from '@features/auth/store';
import { Padding } from '.';
import { currentOrgAtom } from '@shared/store/orgStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@shared/lib/supabase/client';
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAtomValue(userAtom);
  const currentOrg = useAtomValue(currentOrgAtom);

  const activePath =
    ['/dashboard', '/farms'].find((path) =>
      location.pathname.startsWith(path),
    ) || location.pathname;

  return (
    <Padding className="left-0 top-0 z-10 absolute w-[250px]">
      <div className="flex h-full min-h-0 flex-col gap-1 overflow-clip p-4 bg-white/85 text-foreground shadow-xl rounded-3xl border border-gray-200 backdrop-blur-xl bg-opacity-50">
        <Row className="items-center gap-2 select-none">
          <Avatar size="sm">
            <Avatar.Image
              src={currentOrg?.logo_url ?? ''}
              alt={currentOrg?.name ?? ''}
            />
            <Avatar.Fallback>
              {currentOrg?.name?.slice(0, 2) ?? ''}
            </Avatar.Fallback>
          </Avatar>
          <Column className={`space-y-${currentOrg ? '0' : '2'} w-full `}>
            {currentOrg ? (
              <span className="text-sm">{currentOrg?.name}</span>
            ) : (
              <Skeleton className="w-full h-2 bg-black/5" />
            )}
            {currentOrg ? (
              <span className="text-sm text-gray-500">{currentOrg?.role}</span>
            ) : (
              <Skeleton className="w-10 h-2 bg-black/5" />
            )}
          </Column>
        </Row>
        <Separator className="my-1" />
        <ListBox
          aria-label="Users"
          className="w-[200px]"
          selectionMode="none"
          onAction={(key) => navigate(key as string)}
        >
          <ListBox.Item
            id="/dashboard"
            textValue="Bob"
            className={`hover:bg-black/5 ${activePath === '/dashboard' ? 'bg-black/5' : ''}`}
          >
            <HomeIcon className="size-4 " />
            <span>แดชบอร์ด</span>
          </ListBox.Item>
          {/* <ListBox.Item
            id="/farms"
            textValue="Bob"
            className={`hover:bg-black/5 ${activePath === '/farms' ? 'bg-black/5' : ''}`}
          >
            <LandPlotIcon className="size-4" />
            <span>ฟาร์ม</span>
          </ListBox.Item> */}
        </ListBox>
        <Separator className="my-1" />
        <Spacer />
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-black/5"
        >
          <SettingsIcon className="size-4" />
          <span>ตั้งค่า</span>
        </Button>
        <Separator className="my-1" />

        <Row className="items-center gap-2">
          <Avatar size="sm">
            <Avatar.Image src="https://github.com/shadcn.png" />
            <Avatar.Fallback>CN</Avatar.Fallback>
          </Avatar>
          <Column className="min-w-0 flex-1">
            <span className="text-sm truncate block">{user?.user_metadata?.full_name}</span>
            <span className="text-sm truncate text-gray-500 block">{user?.email}</span>
          </Column>
        </Row>
        <Separator className="my-1" />
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-black/5"
          onPress={() => {
            supabase.auth.signOut();
            navigate('/login');
          }}
        >
          <LogOutIcon className="size-4" />
          <span>ออกจากระบบ</span>
        </Button>
      </div>
    </Padding>
  );
};

export default Sidebar;
