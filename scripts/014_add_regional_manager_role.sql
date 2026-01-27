-- Add regional_manager role to user_profiles table
-- Update the CHECK constraint to include the new regional_manager role

ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_role_check
CHECK (role IN ('admin', 'department_head', 'regional_manager', 'staff'));

-- Add region assignment for regional managers
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS assigned_region_id UUID REFERENCES public.regions(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_assigned_region ON public.user_profiles(assigned_region_id);

-- Update RLS policies to allow regional managers to view users in their region
CREATE POLICY "Regional managers can view users in their region" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'regional_manager'
            AND (
                up.assigned_region_id = user_profiles.assigned_region_id
                OR user_profiles.role IN ('admin', 'department_head', 'regional_manager')
            )
        )
    );

-- Allow regional managers to view attendance records for users in their region
CREATE POLICY "Regional managers can view attendance in their region" ON public.attendance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.geofence_locations gl ON gl.district_id IN (
                SELECT d.id FROM public.districts d WHERE d.region_id = up.assigned_region_id
            )
            WHERE up.id = auth.uid()
            AND up.role = 'regional_manager'
            AND (
                attendance_records.check_in_location_id = gl.id
                OR attendance_records.check_out_location_id = gl.id
            )
        )
    );