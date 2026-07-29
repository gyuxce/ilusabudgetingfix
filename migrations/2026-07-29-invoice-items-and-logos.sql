-- Run this migration once in the Supabase SQL Editor.
-- It keeps existing invoices intact and adds optional service lines and client logos.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS logo_url text;

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE RESTRICT,
  description text,
  amount integer NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_items_invoice_engagement_unique UNIQUE (invoice_id, engagement_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_engagement_id ON public.invoice_items(engagement_id);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoice_items_authenticated_all ON public.invoice_items;
CREATE POLICY invoice_items_authenticated_all
ON public.invoice_items
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON TABLE public.invoice_items TO authenticated;
GRANT ALL ON TABLE public.invoice_items TO service_role;

-- Give historical invoices one detail row so their PDFs use the same layout.
INSERT INTO public.invoice_items (invoice_id, engagement_id, description, amount)
SELECT i.id, i.engagement_id, NULL, i.amount
FROM public.invoices i
WHERE NOT EXISTS (
  SELECT 1
  FROM public.invoice_items item
  WHERE item.invoice_id = i.id
);

NOTIFY pgrst, 'reload schema';
