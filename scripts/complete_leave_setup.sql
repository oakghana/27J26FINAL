-- Complete Leave Management System Setup
-- Run this single script to set up the entire leave and checkout time system
-- This script includes all components in the correct order

-- ===========================================
-- PART 1: LEAVE REQUESTS TABLE SETUP
-- ===========================================

-- Drop table if it exists (for clean setup)
DROP TABLE IF EXISTS public.leave_requests CASCADE;

-- Create the leave_requests table with all required columns
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Verify table was created with correct columns
DO $$
DECLARE
  approved_by_exists BOOLEAN := FALSE;
  user_id_exists BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'approved_by'
  ) INTO approved_by_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leave_requests' AND column_name = 'user_id'
  ) INTO user_id_exists;

  IF NOT approved_by_exists OR NOT user_id_exists THEN
    RAISE EXCEPTION 'Table created but missing required columns. approved_by: %, user_id: %', approved_by_exists, user_id_exists;
  END IF;

  RAISE NOTICE '✅ Table leave_requests created successfully with all columns';
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_dates ON leave_requests(user_id, start_date, end_date);

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own leave requests" ON leave_requests;
CREATE POLICY "Users can view their own leave requests"
ON leave_requests FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own leave requests" ON leave_requests;
CREATE POLICY "Users can create their own leave requests"
ON leave_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and managers can view all leave requests" ON leave_requests;
CREATE POLICY "Admins and managers can view all leave requests"
ON leave_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'department_head', 'regional_manager', 'hod', 'it-admin')
  )
);

DROP POLICY IF EXISTS "Admins and managers can update leave requests" ON leave_requests;
CREATE POLICY "Admins and managers can update leave requests"
ON leave_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'department_head', 'regional_manager', 'hod', 'it-admin')
  )
);

-- Add trigger for updated_at (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
    CREATE TRIGGER update_leave_requests_updated_at
      BEFORE UPDATE ON leave_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Migrate existing leave data (only if user_profiles has leave columns)
DO $$
DECLARE
  leave_data_count INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'leave_status') THEN
    -- Insert existing leave data
    INSERT INTO leave_requests (user_id, start_date, end_date, reason, status, approved_by, approved_at)
    SELECT
      id,
      leave_start_date,
      leave_end_date,
      leave_reason,
      'approved'::VARCHAR(20) as status,
      id as approved_by, -- Self-approved
      NOW() as approved_at
    FROM user_profiles
    WHERE leave_status IN ('on_leave', 'sick_leave', 'active')
      AND leave_start_date IS NOT NULL
      AND leave_end_date IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM leave_requests lr
        WHERE lr.user_id = user_profiles.id
        AND lr.start_date = user_profiles.leave_start_date
        AND lr.end_date = user_profiles.leave_end_date
      );

    GET DIAGNOSTICS leave_data_count = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % existing leave records', leave_data_count;
  ELSE
    RAISE NOTICE 'ℹ️  No existing leave data to migrate (leave_status column not found)';
  END IF;
END $$;

-- ===========================================
-- PART 2: CHECKOUT TIME SETUP
-- ===========================================

-- Add checkout_time column to geofence_locations for location-based checkout policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'geofence_locations' AND column_name = 'checkout_time') THEN
    ALTER TABLE public.geofence_locations ADD COLUMN checkout_time TIME DEFAULT '17:00'::TIME;
    RAISE NOTICE '✅ Added checkout_time column to geofence_locations';
  ELSE
    RAISE NOTICE 'ℹ️  checkout_time column already exists';
  END IF;
END $$;

-- Update existing locations to have a default checkout time of 17:00 if not set
UPDATE public.geofence_locations
SET checkout_time = '17:00'::TIME
WHERE checkout_time IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.geofence_locations.checkout_time IS 'The time after which users assigned to this location can check out (e.g., 16:00 or 17:00)';

-- ===========================================
-- PART 3: LEAVE CHECK FUNCTION
-- ===========================================

-- Create function to check if a user is currently on approved leave
CREATE OR REPLACE FUNCTION public.is_user_on_leave(user_uuid UUID, check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if leave_requests table exists first
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.leave_requests
    WHERE user_id = user_uuid
      AND status = 'approved'
      AND start_date <= check_timestamp::DATE
      AND end_date >= check_timestamp::DATE
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_on_leave(UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- ===========================================
-- PART 4: FINAL VERIFICATION
-- ===========================================

-- Verification: Check that everything was created successfully
DO $$
DECLARE
  table_count INTEGER;
  leave_column_count INTEGER;
  checkout_column_count INTEGER;
  function_count INTEGER;
  leave_records_count INTEGER;
BEGIN
  -- Check if leave_requests table exists
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name = 'leave_requests';

  -- Check if approved_by column exists in leave_requests
  SELECT COUNT(*) INTO leave_column_count
  FROM information_schema.columns
  WHERE table_name = 'leave_requests' AND column_name = 'approved_by';

  -- Check if checkout_time column exists
  SELECT COUNT(*) INTO checkout_column_count
  FROM information_schema.columns
  WHERE table_name = 'geofence_locations' AND column_name = 'checkout_time';

  -- Check if function exists
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_name = 'is_user_on_leave';

  -- Check leave records
  SELECT COUNT(*) INTO leave_records_count
  FROM leave_requests;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 LEAVE MANAGEMENT SYSTEM SETUP VERIFICATION:';
  RAISE NOTICE '================================================';
  RAISE NOTICE '  ✅ leave_requests table: %', CASE WHEN table_count > 0 THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  ✅ approved_by column: %', CASE WHEN leave_column_count > 0 THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  ✅ checkout_time column: %', CASE WHEN checkout_column_count > 0 THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  ✅ is_user_on_leave function: %', CASE WHEN function_count > 0 THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  ℹ️  leave records migrated: %', leave_records_count;
  RAISE NOTICE '';

  IF table_count > 0 AND leave_column_count > 0 AND checkout_column_count > 0 AND function_count > 0 THEN
    RAISE NOTICE '🎉 SUCCESS: Leave management system setup completed successfully!';
    RAISE NOTICE '🚀 You can now:';
    RAISE NOTICE '   - Submit leave requests at /dashboard/leave';
    RAISE NOTICE '   - Check-in/check-out will be blocked during approved leave';
    RAISE NOTICE '   - Location-based checkout times are enforced';
    RAISE NOTICE '   - Reports exclude users on leave';
  ELSE
    RAISE EXCEPTION '❌ FAILURE: Some components are missing. Please check the setup and try again.';
  END IF;
END $$;