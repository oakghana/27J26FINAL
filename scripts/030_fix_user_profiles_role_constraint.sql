-- Fix role constraint to include all active roles used by the app
-- Run this if you see: user_profiles_role_check constraint violations

ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_role_check
CHECK (
  role IN (
    'admin',
    'it-admin',
    'department_head',
    'regional_manager',
    'staff',
    'nsp',
    'intern',
    'contract'
  )
);
