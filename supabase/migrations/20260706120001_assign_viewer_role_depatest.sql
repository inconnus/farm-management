-- Assign viewer role to depatest@gmail.com (dashboard-only sidebar)
UPDATE public.organization_members
SET role = 'viewer'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'depatest@gmail.com'
);
