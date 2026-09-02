import { useAuth } from '@features/auth/hooks/useAuth';
import { getKasetkornAuthContext } from '@features/auth/kasetkornAuth';
import { authModeAtom, pluksangSessionAtom } from '@features/auth/store';
import { useCamerasQuery } from '@features/dashboard/hooks';
import { fetchCameraToken } from '@features/dashboard/data/api';
import type { CameraData } from '@features/map/components';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { CctvIcon, LogOutIcon, VideoIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PtzControlPad } from './PtzControlPad';
import { useEzvizPtz } from '../hooks/useEzvizPtz';
import { isEzvizCamera } from '../utils/cameraVendor';
import { CameraGridCell } from './CameraGridCell';

export type CameraGridLayout = 1 | 4 | 9 | 16;

const GRID_LAYOUTS: { size: CameraGridLayout; label: string; cols: number }[] = [
  { size: 1, label: '1', cols: 1 },
  { size: 4, label: '4', cols: 2 },
  { size: 9, label: '9', cols: 3 },
  { size: 16, label: '16', cols: 4 },
];

function gridClass(cols: number): string {
  switch (cols) {
    case 1:
      return 'grid-cols-1 grid-rows-1';
    case 2:
      return 'grid-cols-2 grid-rows-2';
    case 3:
      return 'grid-cols-3 grid-rows-3';
    case 4:
      return 'grid-cols-4 grid-rows-4';
    default:
      return 'grid-cols-2 grid-rows-2';
  }
}

function CameraListItem({
  camera,
  selected,
  onSelect,
}: {
  camera: CameraData;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-2 py-1.5 rounded text-xs truncate transition ${
        selected
          ? 'bg-green-600/20 text-green-300 border border-green-500/40'
          : 'text-gray-300 hover:bg-white/5 border border-transparent'
      }`}
    >
      {camera.name}
    </button>
  );
}

function PtzSidebarPanel({
  camera,
}: {
  camera: CameraData | null;
}) {
  const deviceSerial =
    camera?.deviceSerial ?? camera?.hik?.deviceSerial ?? '';
  const canPtz =
    !!camera &&
    isEzvizCamera(deviceSerial) &&
    camera.isPTZ &&
    camera.canControl;

  const { onDirectionChanged, enabled } = useEzvizPtz(
    deviceSerial,
    canPtz,
  );

  return (
    <div className="shrink-0 border-t border-white/10 p-3">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
        ควบคุม PTZ
      </p>
      {!camera ? (
        <p className="text-xs text-gray-500">เลือกกล้องจากตาราง</p>
      ) : !canPtz ? (
        <p className="text-xs text-gray-500">
          กล้องนี้ไม่รองรับ PTZ
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3 truncate">{camera.name}</p>
          <PtzControlPad
            enabled={enabled}
            onDirectionChanged={onDirectionChanged}
            variant="dark"
          />
          <p className="text-[10px] text-gray-500 mt-2 text-center">
            กดค้างเพื่อเลื่อน ปล่อยเพื่อหยุด
          </p>
        </>
      )}
    </div>
  );
}

export function CameraGridView() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const authMode = useAtomValue(authModeAtom);
  const pluksangSession = useAtomValue(pluksangSessionAtom);
  const auth = getKasetkornAuthContext(authMode, pluksangSession);

  const [gridLayout, setGridLayout] = useState<CameraGridLayout>(4);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layoutRevision, setLayoutRevision] = useState(0);

  useEffect(() => {
    setLayoutRevision((n) => n + 1);
  }, [gridLayout]);

  const { data: cameras = [], isLoading } = useCamerasQuery();
  const tokenQuery = useQuery({
    queryKey: [
      'camera-access-token',
      auth.scope,
      auth.scope === 'farmer' ? auth.appFarmerId : null,
    ] as const,
    queryFn: () => fetchCameraToken(auth),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const accessToken = tokenQuery.data ?? '';
  const streamableCameras = useMemo(
    () => cameras.filter((cam) => cam.mode === 'hik' && cam.hik?.deviceSerial),
    [cameras],
  );

  const layoutConfig =
    GRID_LAYOUTS.find((l) => l.size === gridLayout) ?? GRID_LAYOUTS[1];

  const gridSlots = useMemo(() => {
    const slots: (CameraData | null)[] = Array.from(
      { length: gridLayout },
      () => null,
    );
    streamableCameras.forEach((cam, i) => {
      if (i < gridLayout) slots[i] = cam;
    });
    return slots;
  }, [streamableCameras, gridLayout]);

  const selectedCamera =
    streamableCameras.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (streamableCameras.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !streamableCameras.some((c) => c.id === selectedId)) {
      setSelectedId(streamableCameras[0].id);
    }
  }, [streamableCameras, selectedId]);

  const cols = layoutConfig.cols;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#1a1a1a] text-white">
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — รายการกล้อง + PTZ */}
        <aside className="w-52 shrink-0 flex flex-col border-r border-white/10 bg-[#141414]">
          <div className="shrink-0 px-3 py-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <VideoIcon size={14} className="text-green-400" />
              <span className="text-xs font-semibold text-gray-300">
                จุดติดตั้ง
              </span>
              <span className="text-[10px] text-gray-500">
                ({streamableCameras.length})
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5 camera-list-scroll">
            {isLoading ? (
              <p className="text-xs text-gray-500 px-2">กำลังโหลด…</p>
            ) : streamableCameras.length === 0 ? (
              <p className="text-xs text-gray-500 px-2">ไม่มีกล้อง</p>
            ) : (
              streamableCameras.map((cam) => (
                <CameraListItem
                  key={cam.id}
                  camera={cam}
                  selected={cam.id === selectedId}
                  onSelect={() => setSelectedId(cam.id)}
                />
              ))
            )}
          </div>
          <PtzSidebarPanel camera={selectedCamera} />
          <div className="shrink-0 border-t border-white/10 p-2">
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/auth/login');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-gray-300 transition hover:bg-white/5 hover:text-white"
            >
              <LogOutIcon size={14} />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </aside>

        {/* Main grid */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 min-h-0 p-1 bg-black">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                กำลังโหลดกล้อง…
              </div>
            ) : streamableCameras.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500">
                <CctvIcon size={48} className="text-gray-700" />
                <span className="text-sm">ยังไม่มีกล้องที่รองรับสตรีมสด</span>
              </div>
            ) : !accessToken && !tokenQuery.isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-red-300 px-4 text-center">
                {tokenQuery.error instanceof Error
                  ? tokenQuery.error.message
                  : 'ขอ camera access token ไม่สำเร็จ'}
              </div>
            ) : tokenQuery.isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                กำลังเชื่อมต่อ…
              </div>
            ) : (
              <div
                className={`grid gap-px h-full w-full min-h-0 ${gridClass(cols)} [&>*]:min-h-0 [&>*]:min-w-0`}
              >
                {gridSlots.map((cam, i) =>
                  cam ? (
                    <CameraGridCell
                      key={cam.id}
                      camera={cam}
                      accessToken={accessToken}
                      selected={cam.id === selectedId}
                      onSelect={() => setSelectedId(cam.id)}
                      layoutRevision={layoutRevision}
                    />
                  ) : (
                    <CameraGridCell key={`empty-${i}`} empty />
                  ),
                )}
              </div>
            )}
          </div>

          {/* Bottom toolbar — เลือก layout */}
          <div className="shrink-0 h-10 flex items-center gap-1 px-3 bg-[#2a2a2a] border-t border-white/10">
            <span className="text-[11px] text-gray-400 mr-2">Layout</span>
            {GRID_LAYOUTS.map(({ size, label }) => (
              <button
                key={size}
                type="button"
                onClick={() => setGridLayout(size)}
                className={`min-w-8 h-7 px-2 text-xs font-medium rounded transition ${
                  gridLayout === size
                    ? 'bg-green-600 text-white'
                    : 'bg-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="flex-1" />
            {selectedCamera ? (
              <span className="text-[11px] text-gray-400 truncate max-w-[200px]">
                {selectedCamera.name}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
