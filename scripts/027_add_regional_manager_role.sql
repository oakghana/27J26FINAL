-- Add Regional Manager role to the system
-- This role inherits all permissions from department_head plus regional visibility

-- Update role constraint to include regional_manager
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check
CHECK (role IN ('admin', 'it-admin', 'department_head', 'regional_manager', 'staff', 'nsp', 'intern', 'contract'));

-- Update any existing department_head users to regional_manager if needed
-- (This is optional - existing department heads can be manually updated)

-- Log the role addition
INSERT INTO system_logs (
    event_type,
    event_description,
    metadata,
    created_by
) VALUES (
    'role_added',
    'Added regional_manager role to the system',
    jsonb_build_object(
        'change', 'added_regional_manager_role',
        'valid_roles', ARRAY['admin', 'it-admin', 'department_head', 'regional_manager', 'staff', 'nsp', 'intern', 'contract']
    ),
    'system'
);