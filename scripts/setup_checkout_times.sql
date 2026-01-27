-- Add checkout_time column to geofence_locations for location-based checkout policies
-- This allows each location to have its own checkout time (e.g., 16:00 or 17:00)

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'geofence_locations' AND column_name = 'checkout_time') THEN
    ALTER TABLE public.geofence_locations ADD COLUMN checkout_time TIME DEFAULT '17:00'::TIME;
  END IF;
END $$;

-- Update existing locations to have a default checkout time of 17:00 if not set
UPDATE public.geofence_locations
SET checkout_time = '17:00'::TIME
WHERE checkout_time IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.geofence_locations.checkout_time IS 'The time after which users assigned to this location can check out (e.g., 16:00 or 17:00)';