-- Add water_level device type and seed one next to TVK solar cell.

ALTER TYPE public.device_type ADD VALUE IF NOT EXISTS 'water_level';

-- Place beside solar cell 79b0305c-9a44-48d2-947a-d0e5d9847bd3 on farm TVK
INSERT INTO public.farm_devices (
  farm_id,
  name,
  device_type,
  lat,
  lng,
  config,
  is_active
)
SELECT
  '432155e3-4a5a-4b7d-925b-1a058175819a'::uuid,
  'วัดระดับน้ำ',
  'water_level'::public.device_type,
  14.0186758684454,
  100.766022300943,
  jsonb_build_object(
    'mock', false,
    'max_depth_cm', 300,
    'unit', 'cm',
    'source_solar', 'โซลาร์เซลล์',
    'mqtt_url', 'wss://e882ed7e.ala.dedicated.gcp.emqxcloud.com:8084/mqtt',
    'mqtt_topic', 'makerspace/rice/nodeID123',
    'mqtt_username', 'admin',
    'mqtt_password', 'admin'
  ),
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.farm_devices d
  WHERE d.farm_id = '432155e3-4a5a-4b7d-925b-1a058175819a'
    AND d.device_type = 'water_level'
    AND d.name = 'วัดระดับน้ำ'
);
