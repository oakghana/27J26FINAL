-- Safe leave system setup script - Step by step approach
-- Run this script to set up the complete leave management system

-- Step 1: Drop table if it exists (for clean setup)
DROP TABLE IF EXISTS public.leave_requests CASCADE;

-- Step 2: Create the leave_requests table with all required columns
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

-- Step 3: Verify table was created with correct columns
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

  RAISE NOTICE 'Table leave_requests created successfully with all columns';
END $$;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_dates ON leave_requests(user_id, start_date, end_date);

-- Step 5: Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
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

-- Step 7: Add trigger for updated_at (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
    CREATE TRIGGER update_leave_requests_updated_at
      BEFORE UPDATE ON leave_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Step 8: Migrate existing leave data (only if user_profiles has leave columns)
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
    RAISE NOTICE 'Migrated % existing leave records', leave_data_count;
  ELSE
    RAISE NOTICE 'No existing leave data to migrate (leave_status column not found)';
  END IF;
END $$;