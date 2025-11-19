-- Add category column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS category text;

-- Add comment to explain the column
COMMENT ON COLUMN public.tasks.category IS 'Task category (e.g., Venue, Workout, Chore, etc.)';

