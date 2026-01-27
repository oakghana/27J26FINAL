-- Add checkout_time column to geofence_locations for location-based checkout policies
-- This allows each location to have its own checkout time (e.g., 16:00 or 17:00)

ALTER TABLE public.geofence_locations
ADD COLUMN IF NOT EXISTS checkout_time TIME DEFAULT '17:00'::TIME;

-- Update existing locations to have a default checkout time of 17:00
UPDATE public.geofence_locations
SET checkout_time = '17:00'::TIME
WHERE checkout_time IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.geofence_locations.checkout_time IS 'The time after which users assigned to this location can check out (e.g., 16:00 or 17:00)';