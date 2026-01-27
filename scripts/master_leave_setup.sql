-- Master setup script for leave management system
-- This script now points to the complete setup script

-- To set up the leave management system, run:
-- \i scripts/complete_leave_setup.sql

-- OR copy and paste the contents of scripts/complete_leave_setup.sql
-- into your Supabase SQL Editor or database console

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 LEAVE MANAGEMENT SYSTEM SETUP INSTRUCTIONS:';
  RAISE NOTICE '===============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'To complete the setup, run the following command in your database:';
  RAISE NOTICE '';
  RAISE NOTICE '  \i scripts/complete_leave_setup.sql';
  RAISE NOTICE '';
  RAISE NOTICE 'Or copy and paste the entire contents of:';
  RAISE NOTICE '  scripts/complete_leave_setup.sql';
  RAISE NOTICE '';
  RAISE NOTICE 'Into your Supabase SQL Editor or database console.';
  RAISE NOTICE '';
  RAISE NOTICE 'The script includes:';
  RAISE NOTICE '  ✅ leave_requests table creation';
  RAISE NOTICE '  ✅ checkout_time column addition';
  RAISE NOTICE '  ✅ is_user_on_leave function';
  RAISE NOTICE '  ✅ Data migration and verification';
  RAISE NOTICE '';
END $$;