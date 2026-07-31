-- Run this migration once in the Supabase SQL Editor.
-- Adds an optional "core price label" per engagement (project), so invoice PDFs
-- can display the relationship value (e.g. "FREE" or "Rp 2.500.000") without
-- affecting the actual billed amount stored in service_fee_per_month.
-- Backward compatible: existing rows keep NULL, invoices render unchanged.

ALTER TABLE public.engagements
  ADD COLUMN IF NOT EXISTS list_price_label text;

COMMENT ON COLUMN public.engagements.list_price_label IS
  'Optional free-text label for the core/list price shown on the invoice PDF (e.g. "FREE", "Rp 2.500.000"). Kept separate from service_fee_per_month so booked revenue stays accurate.';

NOTIFY pgrst, 'reload schema';