-- Run this migration once in the Supabase SQL Editor.
-- Prevents duplicate invoice numbers (race condition when two users create
-- invoices concurrently, both computing the next sequence from client cache).
-- Postgres allows multiple NULLs in a UNIQUE constraint, so draft invoices
-- without a number stay unaffected.

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_invoice_number_unique;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);

NOTIFY pgrst, 'reload schema';