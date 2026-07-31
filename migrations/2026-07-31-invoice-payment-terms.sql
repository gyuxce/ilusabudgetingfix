-- Run this migration once in the Supabase SQL Editor.
-- Adds an optional "payment terms" label per invoice (e.g. "Term 1 / DP 50%",
-- "Lunas", "Term 2 / Pelunasan") which is shown on the invoice PDF.
-- Backward compatible: existing invoices keep NULL and render without the term line.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_terms text;

COMMENT ON COLUMN public.invoices.payment_terms IS
  'Optional free-text label describing the payment terms for this invoice (e.g. "Term 1 / DP 50%", "Lunas"). Shown on the invoice PDF only, does not affect booked amount.';

NOTIFY pgrst, 'reload schema';