import { Description, Switch } from '@heroui/react';
import {
  SENSOR_TIME_OPTIONS,
  type SensorApiSettings,
  sensorApiSettingsAtom,
  setSensorApiSettingsAtom,
} from '@shared/store/sensorApiStore';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { RadioIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

type SensorApiPanelProps = {
  isActive: boolean;
};

export const SensorApiPanel = ({ isActive }: SensorApiPanelProps) => {
  const currentSettings = useAtomValue(sensorApiSettingsAtom);
  const setSensorApiSettings = useSetAtom(setSensorApiSettingsAtom);
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<SensorApiSettings>(currentSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isActive) {
      setDraft(currentSettings);
    }
  }, [isActive, currentSettings]);

  const hasChanges =
    draft.mode !== currentSettings.mode ||
    draft.timeRange !== currentSettings.timeRange ||
    draft.useMockData !== currentSettings.useMockData;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      setSensorApiSettings(draft);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['iot-devices'] }),
        queryClient.invalidateQueries({ queryKey: ['iot-telemetry'] }),
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
        <div>
          <h2 className="text-base font-semibold text-gray-800">API เซ็นเซอร์</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            เลือกวิธีดึงข้อมูลสถานะเซ็นเซอร์ IoT
          </p>
        </div>
        <button
          type="button"
          disabled={!hasChanges || isSaving}
          onClick={handleSave}
          className="rounded-xl bg-[#03662c] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#025022] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            ข้อมูล Mock
          </span>
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3">
            <Switch
              isSelected={draft.useMockData}
              onChange={(isSelected) =>
                setDraft((prev) => ({ ...prev, useMockData: isSelected }))
              }
            >
              <Switch.Content>
                <Switch.Control className="data-[selected=true]:bg-[#03662c]">
                  <Switch.Thumb />
                </Switch.Control>
                Mock Sensor
              </Switch.Content>
            </Switch>
          </div>
        </section>

        <section
          className={`flex flex-col gap-3 ${draft.useMockData ? 'opacity-40 pointer-events-none' : ''}`}
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            รูปแบบ API
          </span>

          <label className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="sensor-api-mode"
              className="mt-1 accent-[#03662c]"
              checked={draft.mode === 'last'}
              onChange={() => setDraft((prev) => ({ ...prev, mode: 'last' }))}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-800 block">
                ค่าล่าสุด (GET)
              </span>
              <span className="text-xs text-gray-400 mt-0.5 block font-mono break-all">
                /api/iot/read/last/{'{UID}'}
              </span>
              <span className="text-xs text-gray-500 mt-1 block">
                ดึงค่าเซ็นเซอร์ล่าสุดของแต่ละอุปกรณ์
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="sensor-api-mode"
              className="mt-1 accent-[#03662c]"
              checked={draft.mode === 'all'}
              onChange={() => setDraft((prev) => ({ ...prev, mode: 'all' }))}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-800 block">
                ช่วงเวลา (POST)
              </span>
              <span className="text-xs text-gray-400 mt-0.5 block font-mono break-all">
                /api/iot/read/all
              </span>
              <span className="text-xs text-gray-500 mt-1 block">
                ดึงข้อมูลในช่วงเวลาที่กำหนด แล้วใช้ค่าล่าสุดในช่วงนั้น
              </span>
            </div>
          </label>
        </section>

        {draft.mode === 'all' && !draft.useMockData && (
          <section className="flex flex-col gap-2">
            <label
              htmlFor="sensor-time-range"
              className="text-xs font-semibold uppercase tracking-widest text-gray-400"
            >
              ช่วงเวลา (time)
            </label>
            <select
              id="sensor-time-range"
              value={draft.timeRange}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, timeRange: e.target.value }))
              }
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#03662c]/30"
            >
              {SENSOR_TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
              ส่งใน body เป็น{' '}
              <code className="font-mono text-gray-500">
                {`{"UID": "...", "time": "${draft.timeRange}"}`}
              </code>
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-[#03662c]/15 bg-[#03662c]/5 px-4 py-3">
          <div className="flex items-center gap-2 text-[#03662c] mb-1">
            <RadioIcon className="size-3.5" />
            <span className="text-xs font-semibold">กำลังใช้งาน</span>
          </div>
          <p className="text-xs text-gray-600">
            {currentSettings.useMockData
              ? 'Mock telemetry — จำนวนเท่า API จริง · ออนไลน์ ~87%'
              : currentSettings.mode === 'last'
                ? 'GET /api/iot/read/last/{UID}'
                : `POST /api/iot/read/all — time: ${currentSettings.timeRange}`}
          </p>
        </section>
      </div>
    </>
  );
};
