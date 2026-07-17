/** เป้าหมายเปอร์เซ็นต์ออนไลน์เมื่อใช้ mock telemetry */
export const MOCK_IOT_ONLINE_TARGET_PERCENT = 87;

/**
 * เลือก appIotId ที่ถือว่าออนไลน์ให้ได้ ~targetPercent ของรายการจริง
 * เรียงตาม appIotId เพื่อให้ผลคงที่ระหว่าง refetch
 */
export function pickMockOnlineIds(
  devices: { appIotId: string }[],
  targetPercent = MOCK_IOT_ONLINE_TARGET_PERCENT,
): Set<string> {
  if (devices.length === 0) return new Set();
  const sorted = [...devices].sort((a, b) =>
    a.appIotId.localeCompare(b.appIotId),
  );
  const onlineCount = Math.round((sorted.length * targetPercent) / 100);
  return new Set(sorted.slice(0, onlineCount).map((d) => d.appIotId));
}
