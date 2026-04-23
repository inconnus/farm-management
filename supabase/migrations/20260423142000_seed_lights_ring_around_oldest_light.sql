-- เพิ่มหลอดไฟ 10 ตัว วางเป็นวงรอบหลอด light ตัวแรก (created_at) ของฟาร์มนั้น
-- รัศมีจาก ~120 m ถึง ~1 km (สูตรประมาณที่ lat ~13°N)
-- รันซ้ำได้: ข้ามถ้ามีชื่อ "หลอดไฟ รอบ 1" ในฟาร์มเดียวกันแล้ว

WITH seed AS (
  SELECT farm_id, lat AS clat, lng AS clng
  FROM public.farm_devices
  WHERE device_type = 'light'::device_type
  ORDER BY created_at ASC
  LIMIT 1
)
INSERT INTO public.farm_devices (farm_id, name, device_type, lat, lng, config)
SELECT
  s.farm_id,
  'หลอดไฟ รอบ ' || n,
  'light'::device_type,
  s.clat + (r.r_km / 111.32) * cos(2 * pi() * (n - 1) / 10),
  s.clng + (r.r_km / (111.32 * cos(radians(s.clat)))) * sin(2 * pi() * (n - 1) / 10),
  jsonb_build_object('is_on', false, 'brightness', 100, 'color_temp_k', 4000)
FROM seed s
CROSS JOIN generate_series(1, 10) AS n
CROSS JOIN LATERAL (
  SELECT (0.12 + (n::double precision / 10.0) * 0.88) AS r_km
) r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.farm_devices x
  WHERE x.farm_id = s.farm_id
    AND x.name = 'หลอดไฟ รอบ 1'
);
