-- Add location field to profiles table for AI context
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS location text;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.location IS 'User location in format: "City, Country" for AI to provide local resources';

