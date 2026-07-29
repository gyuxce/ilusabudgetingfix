-- Add payment defaults without changing existing freelancer records.
ALTER TABLE public.freelancers
  ADD COLUMN IF NOT EXISTS default_fee_type text NOT NULL DEFAULT 'hourly';

ALTER TABLE public.freelancers
  ADD COLUMN IF NOT EXISTS default_fixed_amount integer NOT NULL DEFAULT 0;

UPDATE public.freelancers
SET default_fee_type = 'hourly'
WHERE default_fee_type IS NULL OR default_fee_type NOT IN ('hourly', 'fixed');

UPDATE public.freelancers
SET default_fixed_amount = 0
WHERE default_fixed_amount IS NULL OR default_fixed_amount < 0;

ALTER TABLE public.freelancers
  DROP CONSTRAINT IF EXISTS freelancers_default_fee_type_check;

ALTER TABLE public.freelancers
  ADD CONSTRAINT freelancers_default_fee_type_check
  CHECK (default_fee_type IN ('hourly', 'fixed'));

ALTER TABLE public.freelancers
  DROP CONSTRAINT IF EXISTS freelancers_default_fixed_amount_check;

ALTER TABLE public.freelancers
  ADD CONSTRAINT freelancers_default_fixed_amount_check
  CHECK (default_fixed_amount >= 0);

NOTIFY pgrst, 'reload schema';
