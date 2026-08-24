import {
  fetchOrgFarmOptions,
  fetchUserFarmAccessIds,
  setOrgMemberFarmAccess,
  type OrgFarmOption,
} from '@features/auth/orgApi';
import { Button } from '@heroui/react';
import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type MemberFarmAccessPanelProps = {
  orgId: string;
  userId: string;
  displayName: string;
  onClose: () => void;
};

export function MemberFarmAccessPanel({
  orgId,
  userId,
  displayName,
  onClose,
}: MemberFarmAccessPanelProps) {
  const [farms, setFarms] = useState<OrgFarmOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const [farmOptions, accessIds] = await Promise.all([
          fetchOrgFarmOptions(orgId),
          fetchUserFarmAccessIds(orgId, userId),
        ]);
        if (cancelled) return;
        setFarms(farmOptions);
        setSelected(new Set(accessIds));
        setDirty(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'โหลดรายการฟาร์มไม่สำเร็จ',
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, userId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return farms;
    return farms.filter((f) => {
      const hay = `${f.name} ${f.district ?? ''} ${f.province ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [farms, search]);

  const toggle = (farmId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(farmId)) next.delete(farmId);
      else next.add(farmId);
      return next;
    });
    setDirty(true);
  };

  const selectFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const f of filtered) next.add(f.id);
      return next;
    });
    setDirty(true);
  };

  const clearFiltered = () => {
    const filteredIds = new Set(filtered.map((f) => f.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of filteredIds) next.delete(id);
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await setOrgMemberFarmAccess({
        organizationId: orgId,
        userId,
        farmIds: [...selected],
      });
      setDirty(false);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'บันทึกการเข้าถึงฟาร์มไม่สำเร็จ',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-800">
            ฟาร์มที่มองเห็นได้
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {displayName} — สมาชิกจะเห็นเฉพาะฟาร์มที่เลือก
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="ปิด"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="px-6 py-3 border-b border-gray-100 shrink-0 flex flex-col gap-2">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อฟาร์ม อำเภอ จังหวัด..."
            className="w-full h-9 rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#03662c]/50 focus:ring-2 focus:ring-[#03662c]/15"
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
          <span>
            เลือกแล้ว {selected.size.toLocaleString('th-TH')} /{' '}
            {farms.length.toLocaleString('th-TH')} ฟาร์ม
            {search.trim()
              ? ` · แสดง ${filtered.length.toLocaleString('th-TH')}`
              : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectFiltered}
              disabled={isLoading || filtered.length === 0}
              className="text-[#03662c] hover:underline disabled:opacity-40"
            >
              เลือกที่แสดง
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={clearFiltered}
              disabled={isLoading || filtered.length === 0}
              className="text-gray-500 hover:underline disabled:opacity-40"
            >
              ล้างที่แสดง
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-xl bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">
            ไม่พบฟาร์ม
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((farm) => {
              const checked = selected.has(farm.id);
              const location = [farm.district, farm.province]
                .filter(Boolean)
                .join(', ');
              return (
                <li key={farm.id}>
                  <label className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(farm.id)}
                      className="size-4 rounded border-gray-300 text-[#03662c] focus:ring-[#03662c]/30"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-gray-800 truncate">
                        {farm.name}
                      </span>
                      {location ? (
                        <span className="block text-xs text-gray-400 truncate">
                          {location}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && (
        <p className="mx-6 mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 shrink-0">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-3 shrink-0">
        <Button
          variant="secondary"
          onPress={onClose}
          isDisabled={isSaving}
          className="rounded-xl"
        >
          ยกเลิก
        </Button>
        <Button
          onPress={() => void handleSave()}
          isDisabled={isLoading || isSaving || !dirty}
          className="rounded-xl bg-[#03662c] text-white"
        >
          {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </div>
    </div>
  );
}
