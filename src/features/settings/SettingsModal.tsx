import { addOrgMemberByEmail, type InviteOrgRole } from '@features/auth/orgApi';
import {
  Avatar,
  Button,
  Label,
  ListBox,
  Modal,
  Select,
  Separator,
} from '@heroui/react';
import { supabase } from '@shared/lib/supabase/client';
import type { Enums, Tables } from '@shared/lib/supabase/database.types';
import {
  CrownIcon,
  EyeIcon,
  MailIcon,
  MapPinnedIcon,
  RadioIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { MemberFarmAccessPanel } from './MemberFarmAccessPanel';
import { SensorApiPanel } from './SensorApiPanel';

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

type SettingKey = 'members' | 'teams' | 'sensor-api';

const INVITE_ROLES: InviteOrgRole[] = ['member', 'admin', 'viewer'];

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
      {
        key: 'members',
        label: 'สมาชิก',
        icon: <UsersIcon className="size-4" />,
      },
      {
        key: 'teams',
        label: 'ทีม',
        icon: <ShieldCheckIcon className="size-4" />,
      },
    ],
  },
  {
    group: 'IoT',
    items: [
      {
        key: 'sensor-api',
        label: 'API เซ็นเซอร์',
        icon: <RadioIcon className="size-4" />,
      },
    ],
  },
];

// ─── Role helpers ─────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<OrgMemberRole, string> = {
  owner: 'เจ้าของ',
  admin: 'ผู้ดูแล',
  member: 'สมาชิก',
  viewer: 'ผู้ชม',
};

const ROLE_ICON: Record<OrgMemberRole, React.ReactNode> = {
  owner: <CrownIcon className="size-3 text-amber-500" />,
  admin: <ShieldCheckIcon className="size-3 text-blue-500" />,
  member: <UserIcon className="size-3 text-gray-400" />,
  viewer: <EyeIcon className="size-3 text-purple-500" />,
};

const ROLE_BADGE: Record<OrgMemberRole, string> = {
  owner: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  member: 'bg-gray-50 text-gray-600 border-gray-200',
  viewer: 'bg-purple-50 text-purple-700 border-purple-200',
};

function inviteErrorMessage(error: unknown): string {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : String(error);
  if (message.includes('ไม่พบบัญชี'))
    return 'ไม่พบบัญชีที่ใช้อีเมลนี้ กรุณาให้ผู้ใช้สมัครก่อน';
  if (message.includes('อยู่ในองค์กรแล้ว')) return 'ผู้ใช้นี้อยู่ในองค์กรแล้ว';
  if (message.includes('ไม่มีสิทธิ์')) return 'ไม่มีสิทธิ์เชิญสมาชิก';
  if (message.includes('อีเมลไม่ถูกต้อง')) return 'อีเมลไม่ถูกต้อง';
  if (message.includes('บทบาทเจ้าของ'))
    return 'ไม่สามารถมอบบทบาทเจ้าของผ่านการเชิญ';
  return message || 'เชิญสมาชิกไม่สำเร็จ';
}

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

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setIsLoadingMembers(true);
    try {
      const { data: memberRows, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, joined_at')
        .eq('organization_id', orgId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const userIds = memberRows?.map((r) => r.user_id) ?? [];
      let profileMap: Record<
        string,
        Pick<Tables<'profiles'>, 'full_name' | 'avatar_url'>
      > = {};

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
  }, [orgId]);

  useEffect(() => {
    if (!isOpen || !orgId) return;
    void fetchMembers();
  }, [isOpen, orgId, fetchMembers]);

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

        setTeams(
          teamRows.map((t) => ({ ...t, memberCount: countMap[t.id] ?? 0 })),
        );
      } finally {
        setIsLoadingTeams(false);
      }
    };

    void fetchTeams();
  }, [isOpen, orgId]);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-3xl bg-white text-gray-800 border border-gray-200 shadow-2xl overflow-hidden">
            <Modal.CloseTrigger className="hover:bg-gray-100 z-10" />

            <div className="flex h-[540px]">
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

              <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {activeKey === 'members' && (
                  <MembersPanel
                    orgId={orgId}
                    members={members}
                    isLoading={isLoadingMembers}
                    canManage={canManage}
                    currentUserId={currentUserId}
                    onMembersChanged={fetchMembers}
                  />
                )}
                {activeKey === 'teams' && (
                  <TeamsPanel teams={teams} isLoading={isLoadingTeams} />
                )}
                {activeKey === 'sensor-api' && (
                  <SensorApiPanel isActive={activeKey === 'sensor-api'} />
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
  orgId,
  members,
  isLoading,
  canManage,
  currentUserId,
  onMembersChanged,
}: {
  orgId: string | null;
  members: MemberWithProfile[];
  isLoading: boolean;
  canManage: boolean;
  currentUserId: string | null;
  onMembersChanged: () => Promise<void>;
}) => {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteOrgRole>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [farmAccessMember, setFarmAccessMember] =
    useState<MemberWithProfile | null>(null);

  const resetInviteForm = () => {
    setEmail('');
    setRole('member');
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
  };

  const handleOpenInvite = () => {
    resetInviteForm();
    setIsInviteOpen(true);
  };

  const handleCloseInvite = () => {
    if (isSubmitting) return;
    setIsInviteOpen(false);
    resetInviteForm();
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('อีเมลไม่ถูกต้อง');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await addOrgMemberByEmail({
        organizationId: orgId,
        email: trimmed,
        role,
      });
      await onMembersChanged();
      setSuccess(`เพิ่ม ${trimmed} เป็น${ROLE_LABEL[role]} แล้ว`);
      setEmail('');
      setRole('member');
    } catch (err) {
      setError(inviteErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const farmAccessDisplayName =
    farmAccessMember?.profile?.full_name ?? 'ผู้ใช้';

  return (
    <>
      <div className="relative flex flex-col flex-1 min-h-0">
      {farmAccessMember && orgId && (
        <MemberFarmAccessPanel
          orgId={orgId}
          userId={farmAccessMember.user_id}
          displayName={farmAccessDisplayName}
          onClose={() => setFarmAccessMember(null)}
        />
      )}

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
            onClick={handleOpenInvite}
            className="flex items-center gap-1.5 rounded-xl border border-[#03662c]/30 bg-[#03662c]/5 px-3 py-1.5 text-xs font-medium text-[#03662c] hover:bg-[#03662c]/10 transition-colors"
          >
            <MailIcon className="size-3.5" />
            เชิญสมาชิก
          </button>
        )}
      </div>

      {isInviteOpen && (
        <form
          onSubmit={handleInvite}
          className="shrink-0 border-b border-gray-100 bg-[#03662c]/3 px-6 py-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-800">
              เพิ่มสมาชิกด้วยอีเมล
            </span>
            <button
              type="button"
              onClick={handleCloseInvite}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="ปิดฟอร์มเชิญ"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <p className="text-xs text-gray-500">
            ผู้ใช้ต้องมีบัญชีในระบบแล้ว — จะถูกเพิ่มเข้าองค์กรทันทีโดยไม่ต้องยืนยันอีกฝั่ง
            {role === 'member' || role === 'viewer'
              ? ' · สมาชิก/ผู้ชมจะยังไม่เห็นฟาร์มจนกว่าจะตั้งค่าให้'
              : ''}
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-gray-500 mb-1 block">อีเมล</Label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="user@example.com"
                className="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#03662c]/50 focus:ring-2 focus:ring-[#03662c]/15"
              />
            </div>

            <div className="w-full sm:w-44">
              <Label className="text-xs text-gray-500 mb-1 block">บทบาท</Label>
              <Select
                className="w-full"
                value={role}
                onChange={(key) => {
                  if (
                    typeof key === 'string' &&
                    INVITE_ROLES.includes(key as InviteOrgRole)
                  ) {
                    setRole(key as InviteOrgRole);
                  }
                }}
                aria-label="บทบาทสมาชิก"
              >
                <Select.Trigger className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {INVITE_ROLES.map((r) => (
                      <ListBox.Item key={r} id={r} textValue={ROLE_LABEL[r]}>
                        <div className="flex items-center gap-2">
                          {ROLE_ICON[r]}
                          {ROLE_LABEL[r]}
                        </div>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              {success}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onPress={handleCloseInvite}
              isDisabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[#03662c] text-white"
              isDisabled={isSubmitting || !email.trim()}
            >
              {isSubmitting ? 'กำลังเพิ่ม...' : 'ยืนยัน'}
            </Button>
          </div>
        </form>
      )}

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
              onEditFarmAccess={
                canManage &&
                (member.role === 'member' || member.role === 'viewer')
                  ? () => setFarmAccessMember(member)
                  : undefined
              }
            />
          ))
        )}
      </div>
      </div>
    </>
  );
};

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
  onEditFarmAccess,
}: {
  member: MemberWithProfile;
  isCurrentUser: boolean;
  canManage: boolean;
  onEditFarmAccess?: () => void;
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
          <span className="text-sm font-medium text-gray-800 truncate">
            {displayName}
          </span>
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

      {onEditFarmAccess && (
        <button
          type="button"
          onClick={onEditFarmAccess}
          className="p-1.5 rounded-lg text-gray-400 hover:text-[#03662c] hover:bg-[#03662c]/10 transition-colors"
          title="ตั้งค่าฟาร์มที่มองเห็นได้"
        >
          <MapPinnedIcon className="size-3.5" />
        </button>
      )}

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
      style={{
        backgroundColor: `${team.color}22`,
        border: `1.5px solid ${team.color}44`,
      }}
    >
      <div
        className="size-3 rounded-full"
        style={{ backgroundColor: team.color }}
      />
    </div>

    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium text-gray-800 block truncate">
        {team.name}
      </span>
      {team.description && (
        <span className="text-xs text-gray-400 truncate block">
          {team.description}
        </span>
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
