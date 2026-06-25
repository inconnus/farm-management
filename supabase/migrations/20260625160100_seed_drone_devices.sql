-- โดรนเริ่มต้น 1 ลำต่อฟาร์ม (ถ้ายังไม่มี)
INSERT INTO public.farm_devices (farm_id, name, device_type, lat, lng, config)
SELECT
  f.id,
  'โดรนสำรวจ #1',
  'drone'::public.device_type,
  COALESCE(f.lat, 13.7563) + 0.0008,
  COALESCE(f.lng, 100.5018) + 0.0008,
  jsonb_build_object('battery_percent', 85, 'speed_kmh', 28)
FROM public.farms f
WHERE NOT EXISTS (
  SELECT 1
  FROM public.farm_devices d
  WHERE d.farm_id = f.id
    AND d.device_type = 'drone'::public.device_type
);
