-- Create function to check if a user is currently on approved leave
-- Returns true if user has an approved leave that covers the current timestamp

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