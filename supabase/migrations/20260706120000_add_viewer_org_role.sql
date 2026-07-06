-- Add viewer role: dashboard-only access
ALTER TYPE public.org_member_role ADD VALUE IF NOT EXISTS 'viewer';
