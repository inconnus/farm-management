import { Avatar, Modal, Separator } from '@heroui/react';
import { supabase } from '@shared/lib/supabase/client';
import type { Enums, Tables } from '@shared/lib/supabase/database.types';
import {
  CrownIcon,
  MailIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserIcon,
  UsersIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrgMemberRole = Enums<'org_member_role'>;

type MemberWithProfile = {
  id: string;
  user_id: string;
  role: OrgMemberRole;
  joined_at: string;
  profile: Pick<Tables<'profiles'>, 'full_name' | 'avatar_url'> | null;
};

type TeamWithMembers = Tables<'teams'> & { memberCount: number };

type SettingKey = 'members' | 'teams';

// ─── Sidebar nav definition ───────────────────────────────────────────────────

type NavItem = {
  key: SettingKey;
  label: string;
  icon: React.ReactNode;
};

type NavGroup = {
  group: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'องค์กร',
    items: [
      { key: 'members', label: 'สมาชิก', icon: <UsersIcon className="size-4" /> },
      { key: 'teams', label: 'ทีม', icon: <ShieldCheckIcon className="size-4" /> },
    ],
  },
];

// ─── Role helpers ─────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<OrgMemberRole, string> = {
  owner: 'เจ้าของ',
  admin: 'ผู้ดูแล',
  member: 'สมาชิก',
};

const ROLE_ICON: Record<OrgMemberRole, React.ReactNode> = {
  owner: <CrownIcon className="size-3 text-amber-500" />,
  admin: <ShieldCheckIcon className="size-3 text-blue-500" />,
  member: <UserIcon className="size-3 text-gray-400" />,
};

const ROLE_BADGE: Record<OrgMemberRole, string> = {
  owner: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  member: 'bg-gray-50 text-gray-600 border-gray-200',
};

// ─── Props ────────────────────────────────────────────────────────────────────

type SettingsModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string | null;
  currentUserId: string | null;
  currentUserRole: OrgMemberRole | null;
};

// ─── Main component ───────────────────────────────────────────────────────────

export const SettingsModal = ({
  isOpen,
  onOpenChange,
  orgId,
  currentUserId,
  currentUserRole,
}: SettingsModalProps) => {
  const [activeKey, setActiveKey] = useState<SettingKey>('members');
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  // ── Fetch members ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !orgId) return;

    const fetchMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const { data: memberRows, error } = await supabase
          .from('organization_members')
          .select('id, user_id, role, joined_at')
          .eq('organization_id', orgId)
          .order('joined_at', { ascending: true });

        if (error) throw error;

        const userIds = memberRows?.map((r) => r.user_id) ?? [];
        let profileMap: Record<string, Pick<Tables<'profiles'>, 'full_name' | 'avatar_url'>> = {};

        if (userIds.length > 0) {
          const { data: profileRows } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          profileMap = Object.fromEntries(
            (profileRows ?? []).map((p) => [
              p.id,
              { full_name: p.full_name, avatar_url: p.avatar_url },
            ]),
          );
        }

        setMembers(
          (memberRows ?? []).map((m) => ({
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            joined_at: m.joined_at,
            profile: profileMap[m.user_id] ?? null,
          })),
        );
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [isOpen, orgId]);

  // ── Fetch teams ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !orgId) return;

    const fetchTeams = async () => {
      setIsLoadingTeams(true);
      try {
        const { data: farms } = await supabase
          .from('farms')
          .select('id')
          .eq('organization_id', orgId);

        const farmIds = (farms ?? []).map((f) => f.id);
        if (farmIds.length === 0) {
          setTeams([]);
          return;
        }

        const { data: teamRows } = await supabase
          .from('teams')
          .select('*')
          .in('farm_id', farmIds)
          .order('created_at', { ascending: true });

        if (!teamRows) {
          setTeams([]);
          return;
        }

        const teamIds = teamRows.map((t) => t.id);
        const { data: memberCounts } = await supabase
          .from('team_members')
          .select('team_id')
          .in('team_id', teamIds);

        const countMap: Record<string, number> = {};
        for (const row of memberCounts ?? []) {
          countMap[row.team_id] = (countMap[row.team_id] ?? 0) + 1;
        }

        setTeams(teamRows.map((t) => ({ ...t, memberCount: countMap[t.id] ?? 0 })));
      } finally {
        setIsLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [isOpen, orgId]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-3xl bg-white text-gray-800 border border-gray-200 shadow-2xl overflow-hidden">
            <Modal.CloseTrigger className="hover:bg-gray-100 z-10" />

            <div className="flex h-[540px]">
              {/* ── Left Sidebar ────────────────────────────────────────── */}
              <aside className="w-52 shrink-0 flex flex-col gap-1 border-r border-gray-100 bg-gray-50/60 px-3 py-5">
                <span className="px-2 pb-2 text-xs font-bold uppercase tracking-widest text-gray-400 select-none">
                  ตั้งค่า
                </span>

                {NAV_GROUPS.map((group, gi) => (
                  <div key={group.group} className="flex flex-col gap-0.5">
                    {gi > 0 && <Separator className="my-2" />}
                    <span className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
                      {group.group}
                    </span>
                    {group.items.map((item) => {
                      const isActive = activeKey === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveKey(item.key)}
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all text-left w-full ${
                            isActive
                              ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                              : 'text-gray-500 hover:bg-white/70 hover:text-gray-700'
                          }`}
                        >
                          <span
                            className={`transition-colors ${isActive ? 'text-[#03662c]' : 'text-gray-400'}`}
                          >
                            {item.icon}
                          </span>
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </aside>

              {/* ── Right Content ────────────────────────────────────────── */}
              <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {activeKey === 'members' && (
                  <MembersPanel
                    members={members}
                    isLoading={isLoadingMembers}
                    canManage={canManage}
                    currentUserId={currentUserId}
                  />
                )}
                {activeKey === 'teams' && (
                  <TeamsPanel teams={teams} isLoading={isLoadingTeams} />
                )}
              </main>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

// ─── Members Panel ────────────────────────────────────────────────────────────

const MembersPanel = ({
  members,
  isLoading,
  canManage,
  currentUserId,
}: {
  members: MemberWithProfile[];
  isLoading: boolean;
  canManage: boolean;
  currentUserId: string | null;
}) => (
  <>
    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
      <div>
        <h2 className="text-base font-semibold text-gray-800">สมาชิก</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {isLoading ? '...' : `${members.length} คนในองค์กร`}
        </p>
      </div>
      {canManage && (
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-xl border border-[#03662c]/30 bg-[#03662c]/5 px-3 py-1.5 text-xs font-medium text-[#03662c] hover:bg-[#03662c]/10 transition-colors"
        >
          <MailIcon className="size-3.5" />
          เชิญสมาชิก
        </button>
      )}
    </div>
    <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
      {isLoading ? (
        <RowSkeleton />
      ) : (
        members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isCurrentUser={member.user_id === currentUserId}
            canManage={canManage && member.role !== 'owner'}
          />
        ))
      )}
    </div>
  </>
);

// ─── Teams Panel ──────────────────────────────────────────────────────────────

const TeamsPanel = ({
  teams,
  isLoading,
}: {
  teams: TeamWithMembers[];
  isLoading: boolean;
}) => (
  <>
    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
      <div>
        <h2 className="text-base font-semibold text-gray-800">ทีม</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {isLoading ? '...' : `${teams.length} ทีม`}
        </p>
      </div>
    </div>
    <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
      {isLoading ? (
        <RowSkeleton />
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
          <UsersIcon className="size-12 opacity-20" />
          <span className="text-sm">ยังไม่มีทีม</span>
        </div>
      ) : (
        teams.map((team) => <TeamRow key={team.id} team={team} />)
      )}
    </div>
  </>
);

// ─── MemberRow ────────────────────────────────────────────────────────────────

const MemberRow = ({
  member,
  isCurrentUser,
  canManage,
}: {
  member: MemberWithProfile;
  isCurrentUser: boolean;
  canManage: boolean;
}) => {
  const displayName = member.profile?.full_name ?? 'ผู้ใช้';
  const initials = displayName.slice(0, 2).toUpperCase();
  const joined = new Date(member.joined_at).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3 hover:bg-gray-50 transition-colors">
      <Avatar size="sm">
        {member.profile?.avatar_url ? (
          <Avatar.Image src={member.profile.avatar_url} alt={displayName} />
        ) : null}
        <Avatar.Fallback className="text-xs bg-[#03662c]/10 text-[#03662c] font-semibold">
          {initials}
        </Avatar.Fallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-800 truncate">{displayName}</span>
          {isCurrentUser && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full border border-gray-200">
              คุณ
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">เข้าร่วม {joined}</span>
      </div>

      <div
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${ROLE_BADGE[member.role]}`}
      >
        {ROLE_ICON[member.role]}
        {ROLE_LABEL[member.role]}
      </div>

      {canManage && (
        <button
          type="button"
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="นำออกจากองค์กร"
        >
          <Trash2Icon className="size-3.5" />
        </button>
      )}
    </div>
  );
};

// ─── TeamRow ──────────────────────────────────────────────────────────────────

const TeamRow = ({ team }: { team: TeamWithMembers }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3 hover:bg-gray-50 transition-colors">
    <div
      className="size-8 rounded-xl shrink-0 flex items-center justify-center"
      style={{ backgroundColor: `${team.color}22`, border: `1.5px solid ${team.color}44` }}
    >
      <div className="size-3 rounded-full" style={{ backgroundColor: team.color }} />
    </div>

    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium text-gray-800 block truncate">{team.name}</span>
      {team.description && (
        <span className="text-xs text-gray-400 truncate block">{team.description}</span>
      )}
    </div>

    <div className="flex items-center gap-1 text-xs text-gray-400">
      <UsersIcon className="size-3.5" />
      <span>{team.memberCount} คน</span>
    </div>

    <Separator orientation="vertical" className="h-4" />

    <span className="text-xs text-gray-400 whitespace-nowrap">
      {new Date(team.created_at).toLocaleDateString('th-TH', {
        month: 'short',
        year: 'numeric',
      })}
    </span>
  </div>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const RowSkeleton = () => (
  <div className="flex flex-col gap-2">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 animate-pulse"
      >
        <div className="size-8 rounded-full bg-gray-200" />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-3 w-32 rounded-full bg-gray-200" />
          <div className="h-2.5 w-20 rounded-full bg-gray-100" />
        </div>
        <div className="h-5 w-16 rounded-full bg-gray-200" />
      </div>
    ))}
  </div>
);
