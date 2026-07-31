-- Run this migration once in the Supabase SQL Editor.
-- Adds per-service (invoice_items) optional payment terms fields so each
-- service line in an invoice can describe its own term/percent and the
-- charged amount reflects it (e.g. base 1.000.000, Term 1, 50% -> 500.000).
-- Backward compatible: existing rows keep NULL and render unchanged.

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS payment_percent numeric(5,2) CHECK (payment_percent IS NULL OR (payment_percent >= 0 AND payment_percent <= 100));

COMMENT ON COLUMN public.invoice_items.payment_terms IS
  'Optional free-text label for this invoice line term (e.g. "Term 1"). Shown on the invoice PDF.';
COMMENT ON COLUMN public.invoice_items.payment_percent IS
  'Optional percent (0-100) of base price that this line charges (e.g. 50 means 50%). Shown on the invoice PDF next to the term label.';

NOTIFY pgrst, 'reload schema';