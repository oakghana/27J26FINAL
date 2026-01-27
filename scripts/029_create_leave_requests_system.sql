-- Create leave requests table for proper leave management with approval workflow
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_dates ON leave_requests(user_id, start_date, end_date);

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own leave requests
CREATE POLICY "Users can view their own leave requests"
ON leave_requests FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own leave requests
CREATE POLICY "Users can create their own leave requests"
ON leave_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins, department heads, and regional managers can view all leave requests
CREATE POLICY "Admins and managers can view all leave requests"
ON leave_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'department_head', 'regional_manager')
  )
);

-- Admins, department heads, and regional managers can update leave request status
CREATE POLICY "Admins and managers can update leave requests"
ON leave_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'department_head', 'regional_manager')
  )
);

-- Create trigger for updated_at (only if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_leave_requests_updated_at
      BEFORE UPDATE ON leave_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Migrate existing leave data from user_profiles to leave_requests
-- Only migrate users who are currently marked as on leave
INSERT INTO leave_requests (user_id, start_date, end_date, reason, status, approved_by, approved_at)
SELECT
  id,
  leave_start_date,
  leave_end_date,
  leave_reason,
  CASE
    WHEN leave_status = 'active' THEN 'approved'
    WHEN leave_status IN ('on_leave', 'sick_leave') THEN 'approved'
    ELSE 'pending'
  END as status,
  CASE
    WHEN leave_status IN ('on_leave', 'sick_leave') THEN id  -- Self-approved for migration
    ELSE NULL
  END as approved_by,
  CASE
    WHEN leave_status IN ('on_leave', 'sick_leave') THEN NOW()
    ELSE NULL
  END as approved_at
FROM user_profiles
WHERE leave_status IN ('on_leave', 'sick_leave')
  AND leave_start_date IS NOT NULL
  AND leave_end_date IS NOT NULL;

-- Note: We keep the existing leave_status columns in user_profiles for backwards compatibility
-- but the new leave_requests table will be the source of truth for leave management