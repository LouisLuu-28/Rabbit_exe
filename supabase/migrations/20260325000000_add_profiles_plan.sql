ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'unpaid'
CHECK (plan IN ('unpaid', 'basic', 'standard', 'premium'));

UPDATE public.profiles
SET plan = 'unpaid'
WHERE plan IS NULL;
