import { organizationsAtom, userAtom } from '@features/auth/store';
import { SettingsModal } from '@features/settings/SettingsModal';
import {
  Avatar,
  Button,
  Description,
  Label,
  ListBox,
  Separator,
  Skeleton,
} from '@heroui/react';
import { supabase } from '@shared/lib/supabase/client';
import { setCurrentOrgAtom } from '@shared/store/orgStore';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  CctvIcon,
  GlobeIcon,
  HomeIcon,
  LandPlotIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Column, Padding, Row, Spacer } from '.';
import { mapInstanceAtom } from '@shared/store/mapStore';
import { DEFAULT_MAP_OVERVIEW } from 'src/const/map';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const user = useAtomValue(userAtom);
  const organizations = useAtomValue(organizationsAtom);
  const map = useAtomValue(mapInstanceAtom);
  const setCurrentOrg = useSetAtom(setCurrentOrgAtom);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Derive current org from URL slug
  const currentOrg = organizations.find((o) => o.slug === orgSlug) ?? null;

  useEffect(() => {
    setCurrentOrg(currentOrg);
  }, [currentOrg, setCurrentOrg]);

  const base = `/${orgSlug}`;
  const activePath =
    [`${base}/dashboard`, `${base}/farms`, `${base}/camera`].find((path) =>
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
        <Row className='justify-between items-center'>
          <span className='text-xs text-gray-500'>สาธารณะ</span>
          <GlobeIcon className='size-3 text-gray-400' />
        </Row>
        <ListBox
          aria-label="Navigation"
          className="w-[200px]"
          selectionMode="none"
          onAction={(key) => {
            map?.flyTo(DEFAULT_MAP_OVERVIEW);
            return navigate(`${base}/${key}`);
          }}
        >
          <ListBox.Item
            id="dashboard"
            textValue="แดชบอร์ด"
            className={`hover:bg-black/5 px-2 ${activePath === `${base}/dashboard` ? 'bg-black/5' : ''}`}
          >
            <HomeIcon className="size-4 " />
            <span>แดชบอร์ด</span>
          </ListBox.Item>

          <ListBox.Item
            id="camera"
            textValue="กล้องจราจร"
            className={`hover:bg-black/5 px-2 ${activePath === `${base}/camera` ? 'bg-black/5' : ''}`}
          >
            <CctvIcon className="size-4" />
            <span>กล้องจราจร</span>
          </ListBox.Item>
        </ListBox>
        <Row className='justify-between items-center'>
          <span className='text-xs text-gray-500'>ส่วนตัว</span>
          <UserIcon className='size-3 text-gray-400' />
        </Row>
        <ListBox
          aria-label="Navigation"
          className="w-[200px]"
          selectionMode="none"
          onAction={(key) => {
            map?.flyTo(DEFAULT_MAP_OVERVIEW);
            return navigate(`${base}/${key}`);
          }}
        >

          <ListBox.Item
            id="farms"
            textValue="ฟาร์ม"
            className={`hover:bg-black/5 px-2 ${activePath === `${base}/farms` ? 'bg-black/5' : ''}`}
          >
            <LandPlotIcon className="size-4" />
            <span>ฟาร์ม</span>
          </ListBox.Item>
        </ListBox>
        <Separator className="my-1" />
        <Spacer />
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-black/5 px-3"
          onPress={() => setIsSettingsOpen(true)}
        >
          <SettingsIcon className="size-4" />
          <span>ตั้งค่า</span>
        </Button>

        <SettingsModal
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          orgId={currentOrg?.id ?? null}
          currentUserId={user?.id ?? null}
          currentUserRole={currentOrg?.role ?? null}
        />
        <Separator className="my-1" />

        <Row className="items-center gap-2 hover:bg-black/5 rounded-2xl cursor-pointer p-2">
          <Avatar size="sm">
            {/* <Avatar.Image src="https://github.com/shadcn.png" /> */}
            <Avatar.Fallback>
              {user?.email?.slice(0, 2).toUpperCase()}
            </Avatar.Fallback>
          </Avatar>
          <Column className="min-w-0 flex-1">
            <span className="text-sm truncate block">
              {user?.user_metadata?.full_name}
            </span>
            <span className="text-sm truncate text-gray-500 block">
              {user?.email}
            </span>
          </Column>
        </Row>
        <Separator className="my-1" />
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-black/5"
          onPress={() => {
            supabase.auth.signOut();
            navigate('/auth/login');
          }}
        >
          <LogOutIcon className="size-4" />
          <span>ออกจากระบบ</span>
        </Button>
      </div>
    </Padding >
  );
};

export default Sidebar;
