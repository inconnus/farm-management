/** Ezviz ISGP: 1 = HD, 2 = Smooth (ต่ำ) */
export const EZVIZ_STREAM_QUALITY = {
  HD: 1,
  LOW: 2,
} as const;

export type EzvizStreamQuality =
  (typeof EZVIZ_STREAM_QUALITY)[keyof typeof EZVIZ_STREAM_QUALITY];

export const DEFAULT_EZVIZ_STREAM_QUALITY = EZVIZ_STREAM_QUALITY.LOW;

export const EZVIZ_QUALITY_OPTIONS: {
  value: EzvizStreamQuality;
  label: string;
}[] = [
  { value: EZVIZ_STREAM_QUALITY.LOW, label: 'ต่ำ' },
  { value: EZVIZ_STREAM_QUALITY.HD, label: 'HD' },
];

export function ezvizQualityLabel(quality: number): string {
  return (
    EZVIZ_QUALITY_OPTIONS.find((o) => o.value === quality)?.label ?? 'ต่ำ'
  );
}
