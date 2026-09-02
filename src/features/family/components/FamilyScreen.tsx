import { Row } from '@app/layout';
import { useAppBasePath } from '@features/auth/hooks/useAppBasePath';
import { familyMemberDisplayName } from '@features/family/types';
import { SidebarNav, type SidebarNavAPI } from '@shared/ui/SidebarNav';
import { ChevronLeft, UserPlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import { FamilyDevicesPanel } from './FamilyDevicesPanel';
import { FamilyInvitePanel } from './FamilyInvitePanel';
import { FamilyMainPanel } from './FamilyMainPanel';

export function FamilyScreen() {
  const basePath = useAppBasePath();
  const sharingPath = `${basePath}/device-sharing`;

  const pages = useMemo(
    () => [
      {
        key: 'main',
        path: '',
        render: (nav: SidebarNavAPI) => <FamilyMainPanel nav={nav} />,
      },
      {
        key: 'devices',
        path: 'devices',
        render: (nav: SidebarNavAPI) => <FamilyDevicesPanel nav={nav} />,
      },
      {
        key: 'invite',
        path: 'invite',
        render: (nav: SidebarNavAPI) => <FamilyInvitePanel nav={nav} />,
      },
    ],
    [],
  );

  return (
    <SidebarNav basePath={sharingPath} pages={pages} className="w-[420px]" />
  );
}

export function FamilyPanelHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <Row className="items-center gap-2 px-3 pt-2 pb-1">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="p-1 rounded-lg hover:bg-black/5"
        >
          <ChevronLeft className="size-5 text-gray-600" />
        </button>
      )}
      <span className="text-[17px] font-semibold text-gray-900 flex-1 text-center">
        {title}
      </span>
      {onBack && <span className="w-7" />}
    </Row>
  );
}

export { familyMemberDisplayName, UserPlusIcon };
