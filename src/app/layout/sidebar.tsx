import {
  authModeAtom,
  organizationsAtom,
  pluksangSessionAtom,
  userAtom,
} from '@features/auth/store';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useAppBasePath } from '@features/auth/hooks/useAppBasePath';
import { formatFarmerDisplayName } from '@features/dashboard/data/api';
import { useFarmerQuery } from '@features/dashboard/hooks';
import { useIncomingInvitesQuery } from '@features/family/hooks';
import { SettingsModal } from '@features/settings/SettingsModal';
import {
  Avatar,
  Button,
  ListBox,
  Separator,
  Skeleton,
} from '@heroui/react';
import {
  canAccessNavItem,
  canAccessSettings,
  ORG_ROLE_LABEL,
} from '@shared/lib/permissions';
import { mapInstanceAtom } from '@shared/store/mapStore';
import { setCurrentOrgAtom } from '@shared/store/orgStore';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  BellIcon,
  CctvIcon,
  GlobeIcon,
  HomeIcon,
  LandPlotIcon,
  LogOutIcon,
  Share2Icon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { DEFAULT_MAP_OVERVIEW } from 'src/const/map';
import { Column, Padding, Row, Spacer } from '.';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const basePath = useAppBasePath();
  const user = useAtomValue(userAtom);
  const authMode = useAtomValue(authModeAtom);
  const pluksangSession = useAtomValue(pluksangSessionAtom);
  const organizations = useAtomValue(organizationsAtom);
  const map = useAtomValue(mapInstanceAtom);
  const setCurrentOrg = useSetAtom(setCurrentOrgAtom);
  const { signOut } = useAuth();
  const { data: farmer, isLoading: farmerLoading } = useFarmerQuery();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isPluksang = authMode === 'pluksang';

  // Derive current org from URL slug
  const currentOrg = organizations.find((o) => o.slug === orgSlug) ?? null;

  useEffect(() => {
    setCurrentOrg(currentOrg);
  }, [currentOrg, setCurrentOrg]);

  const base = basePath;
  const role = currentOrg?.role ?? null;
  const showDashboard = isPluksang || canAccessNavItem(role, 'dashboard');
  const showCamera = !isPluksang && canAccessNavItem(role, 'camera');
  const showIotCameras = isPluksang || canAccessNavItem(role, 'iot-cameras');
  const showDeviceSharing = isPluksang;
  const showNotifications = isPluksang;
  const showFarms = !isPluksang && canAccessNavItem(role, 'farms');
  const showSettings = !isPluksang && canAccessSettings(role);
  const { data: incomingInvites = [] } = useIncomingInvitesQuery();
  const inviteCount = showNotifications ? incomingInvites.length : 0;
  const activePath =
    [
      `${base}/dashboard`,
      `${base}/farms`,
      `${base}/camera`,
      `${base}/iot-cameras`,
      `${base}/device-sharing`,
      `${base}/notifications`,
    ].find((path) => location.pathname.startsWith(path)) || location.pathname;

  const farmerName = farmer ? formatFarmerDisplayName(farmer) : null;
  const displayName = isPluksang
    ? farmerName ?? (farmerLoading ? '' : pluksangSession?.mobileNo ?? 'ปลูกสร้าง')
    : (user?.user_metadata?.full_name ?? user?.email ?? '');
  const displaySubtitle = isPluksang
    ? pluksangSession?.appFarmerId ?? ''
    : (user?.email ?? '');
  const avatarInitials = isPluksang
    ? farmer
      ? `${farmer.firstName?.slice(0, 1) ?? ''}${farmer.lastName?.slice(0, 1) ?? ''}`.toUpperCase()
      : displayName.slice(0, 2).toUpperCase() || 'ปล'
    : displayName.slice(0, 2).toUpperCase();

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
              {isPluksang
                ? 'ปล'
                : (currentOrg?.name?.slice(0, 2) ?? '')}
            </Avatar.Fallback>
          </Avatar>
          <Column className={`space-y-${currentOrg || isPluksang ? '0' : '2'} w-full `}>
            {isPluksang ? (
              <span className="text-sm">ปลูกสร้าง</span>
            ) : currentOrg ? (
              <span className="text-sm">{currentOrg?.name}</span>
            ) : (
              <Skeleton className="w-full h-2 bg-black/5" />
            )}
            {isPluksang ? (
              <span className="text-sm text-gray-500">เกษตรกร</span>
            ) : currentOrg ? (
              <span className="text-sm text-gray-500">
                {ORG_ROLE_LABEL[currentOrg.role] ?? currentOrg.role}
              </span>
            ) : (
              <Skeleton className="w-10 h-2 bg-black/5" />
            )}
          </Column>
        </Row>
        <Separator className="my-1" />
        {(showDashboard || showCamera || showIotCameras) && (
          <>
            {(showCamera || showIotCameras || showFarms) && (
              <Row className="justify-between items-center">
                <span className="text-xs text-gray-500">สาธารณะ</span>
                <GlobeIcon className="size-3 text-gray-400" />
              </Row>
            )}
            <ListBox
              aria-label="Navigation"
              className="w-[200px]"
              selectionMode="none"
              onAction={(key) => {
                map?.flyTo(DEFAULT_MAP_OVERVIEW);
                return navigate(`${base}/${key}`);
              }}
            >
              {showDashboard && (
                <ListBox.Item
                  id="dashboard"
                  textValue="แดชบอร์ด"
                  className={`hover:bg-black/5 px-2 ${activePath === `${base}/dashboard` ? 'bg-black/5' : ''}`}
                >
                  <HomeIcon className="size-4 " />
                  <span>แดชบอร์ด</span>
                </ListBox.Item>
              )}

              {showCamera && (
                <ListBox.Item
                  id="camera"
                  textValue="กล้องจราจร"
                  className={`hover:bg-black/5 px-2 ${activePath === `${base}/camera` ? 'bg-black/5' : ''}`}
                >
                  <CctvIcon className="size-4" />
                  <span>กล้องจราจร</span>
                </ListBox.Item>
              )}

              {showIotCameras && (
                <ListBox.Item
                  id="iot-cameras"
                  textValue="กล้อง"
                  className={`hover:bg-black/5 px-2 ${activePath.startsWith(`${base}/iot-cameras`) ? 'bg-black/5' : ''}`}
                >
                  <CctvIcon className="size-4" />
                  <span>กล้อง</span>
                </ListBox.Item>
              )}
            </ListBox>
          </>
        )}
        {(showDeviceSharing || showNotifications) && (
          <>
            <Row className="justify-between items-center">
              <span className="text-xs text-gray-500">ส่วนตัว</span>
              <UserIcon className="size-3 text-gray-400" />
            </Row>
            <ListBox
              aria-label="Personal"
              className="w-[200px]"
              selectionMode="none"
              onAction={(key) => {
                map?.flyTo(DEFAULT_MAP_OVERVIEW);
                return navigate(`${base}/${key}`);
              }}
            >
              {showNotifications && (
                <ListBox.Item
                  id="notifications"
                  textValue="แจ้งเตือน"
                  className={`hover:bg-black/5 px-2 ${activePath.startsWith(`${base}/notifications`) ? 'bg-black/5' : ''}`}
                >
                  <BellIcon className="size-4" />
                  <span className="flex-1">แจ้งเตือน</span>
                  {inviteCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-orange-500 text-white text-[11px] font-semibold flex items-center justify-center">
                      {inviteCount > 99 ? '99+' : inviteCount}
                    </span>
                  )}
                </ListBox.Item>
              )}
              {showDeviceSharing && (
                <ListBox.Item
                  id="device-sharing"
                  textValue="แชร์อุปกรณ์"
                  className={`hover:bg-black/5 px-2 ${activePath.startsWith(`${base}/device-sharing`) ? 'bg-black/5' : ''}`}
                >
                  <Share2Icon className="size-4" />
                  <span>แชร์อุปกรณ์</span>
                </ListBox.Item>
              )}
            </ListBox>
          </>
        )}
        {showFarms && (
          <>
            <Row className="justify-between items-center">
              <span className="text-xs text-gray-500">ส่วนตัว</span>
              <UserIcon className="size-3 text-gray-400" />
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
          </>
        )}
        <Separator className="my-1" />
        <Spacer />
        {showSettings && (
          <>
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
          </>
        )}
        <Separator className="my-1" />

        <Row className="items-center gap-2 hover:bg-black/5 rounded-2xl cursor-pointer p-2">
          <Avatar size="sm">
            <Avatar.Fallback>{avatarInitials}</Avatar.Fallback>
          </Avatar>
          <Column className="min-w-0 flex-1">
            {isPluksang && farmerLoading ? (
              <Skeleton className="h-4 w-24 bg-black/5" />
            ) : (
              <span className="text-sm truncate block">{displayName}</span>
            )}
            <span className="text-sm truncate text-gray-500 block">
              {displaySubtitle}
            </span>
          </Column>
        </Row>
        <Separator className="my-1" />
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-black/5"
          onPress={async () => {
            await signOut();
            navigate('/auth/login');
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
