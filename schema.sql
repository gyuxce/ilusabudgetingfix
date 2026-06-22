-- ==========================================
-- PT Jangkar Global Groups (ILUSA)
-- Consolidated Database Schema & Migrations
-- ==========================================

-- ===== 0. Pre-clean existing views to avoid PostgreSQL 'cannot drop columns from view' errors =====
DROP VIEW IF EXISTS invoices_with_payments CASCADE;

-- ===== 1. Master Tables =====

-- ===== clients =====
CREATE TABLE IF NOT EXISTS clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name text NOT NULL UNIQUE,
    pic_name text,
    phone_number text,
    location text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== freelancers =====
CREATE TABLE IF NOT EXISTS freelancers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    default_hourly_rate integer DEFAULT 17000,
    specialization text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== services =====
CREATE TABLE IF NOT EXISTS services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    service_type text NOT NULL CHECK (service_type IN ('monthly', 'one_time')),
    fee_type text NOT NULL CHECK (fee_type IN ('hourly', 'per_content', 'fixed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT services_name_type_unique UNIQUE (name, service_type)
);

-- ===== engagements =====
CREATE TABLE IF NOT EXISTS engagements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    service_fee_per_month integer NOT NULL DEFAULT 0,
    start_date date NOT NULL,
    finish_date date,
    status text NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'finished', 'hold')),
    qtn_url text,
    report_url text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== invoices =====
CREATE TABLE IF NOT EXISTS invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id uuid NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
    billing_month text,
    period_month text,
    invoice_number text,
    amount integer NOT NULL,
    issue_date date NOT NULL,
    due_date date NOT NULL,
    paid_date date,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'paid')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== invoice_payments =====
CREATE TABLE IF NOT EXISTS invoice_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount integer NOT NULL CHECK (amount > 0),
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    payment_method text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== client_advances =====
CREATE TABLE IF NOT EXISTS client_advances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    title text NOT NULL,
    category text NOT NULL DEFAULT 'other' CHECK (category IN ('ads', 'tools', 'production', 'operational', 'other')),
    amount integer NOT NULL CHECK (amount > 0),
    spend_date date NOT NULL DEFAULT CURRENT_DATE,
    period_month text NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reimbursed', 'written_off')),
    reimbursed_date date,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== freelancer_fees =====
CREATE TABLE IF NOT EXISTS freelancer_fees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    freelancer_id uuid NOT NULL REFERENCES freelancers(id) ON DELETE RESTRICT,
    engagement_id uuid NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
    period_month text NOT NULL,
    fee_type text NOT NULL CHECK (fee_type IN ('hourly', 'per_content', 'fixed')),
    
    -- Hourly fields
    hourly_rate integer,
    hours_per_day numeric(4,2),
    working_days integer,
    off_days integer DEFAULT 0,
    
    -- Content fields
    rate_single_post integer,
    rate_carousel integer,
    rate_reels integer,
    qty_single_post integer DEFAULT 0,
    qty_carousel integer DEFAULT 0,
    qty_reels integer DEFAULT 0,
    
    -- Fixed field
    fixed_amount integer,
    
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
    paid_date date,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Drop calculated_fee first if it exists as generated column to recreate cleanly
ALTER TABLE freelancer_fees DROP COLUMN IF EXISTS calculated_fee;
ALTER TABLE freelancer_fees ADD COLUMN calculated_fee integer GENERATED ALWAYS AS (
  CASE 
    WHEN fee_type = 'hourly' THEN 
      (COALESCE(hourly_rate, 0) * COALESCE(hours_per_day, 0) * COALESCE(working_days, 0))::integer
    WHEN fee_type = 'per_content' THEN 
      (COALESCE(rate_single_post, 0) * COALESCE(qty_single_post, 0)) +
      (COALESCE(rate_carousel, 0) * COALESCE(qty_carousel, 0)) +
      (COALESCE(rate_reels, 0) * COALESCE(qty_reels, 0))
    WHEN fee_type = 'fixed' THEN 
      COALESCE(fixed_amount, 0)
    ELSE 0
  END
) STORED;

-- ===== proposals =====
CREATE TABLE IF NOT EXISTS proposals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
    prospect_name text,
    prospect_email text,
    prospect_company text,
    proposal_number text UNIQUE NOT NULL,
    title text NOT NULL,
    introduction text,
    terms_and_conditions text,
    validity_days integer NOT NULL DEFAULT 14,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
    sent_date date,
    approved_date date,
    total_amount integer NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    -- Alternative columns for robustness
    terms text,
    tnc text,
    company text,
    email text,
    name text,
    CONSTRAINT proposals_recipient_check CHECK (
        client_id IS NOT NULL OR prospect_name IS NOT NULL OR name IS NOT NULL
    )
);

-- ===== proposal_items =====
CREATE TABLE IF NOT EXISTS proposal_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    service_id uuid REFERENCES services(id) ON DELETE SET NULL,
    custom_name text,
    description text,
    service_type text NOT NULL DEFAULT 'one_time' CHECK (service_type IN ('monthly', 'one_time')),
    price integer NOT NULL DEFAULT 0,
    quantity integer NOT NULL DEFAULT 1,
    subtotal integer GENERATED ALWAYS AS (price * quantity) STORED,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    -- Alternative columns for robustness
    qty integer,
    item_name text,
    name text,
    type text,
    CONSTRAINT proposal_items_name_check CHECK (
        service_id IS NOT NULL OR custom_name IS NOT NULL OR name_check_or_item_name IS NOT NULL OR name IS NOT NULL OR item_name IS NOT NULL
    )
);

-- Adjust constraint on proposal_items to allow robust alternative names
ALTER TABLE proposal_items DROP CONSTRAINT IF EXISTS proposal_items_name_check;
ALTER TABLE proposal_items ADD CONSTRAINT proposal_items_name_check CHECK (
    service_id IS NOT NULL OR custom_name IS NOT NULL OR name IS NOT NULL OR item_name IS NOT NULL
);

-- ===== documents (PDF generation logs) =====
CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type text NOT NULL CHECK (document_type IN ('proposal', 'invoice_pdf', 'freelance_slip', 'receipt')),
    reference_id uuid NOT NULL,
    reference_type text NOT NULL,
    filename text NOT NULL,
    generated_at timestamptz NOT NULL DEFAULT now(),
    notes text
);

-- ===== company_settings (Singleton) =====
CREATE TABLE IF NOT EXISTS company_settings (
    id integer PRIMARY KEY DEFAULT 1,
    legal_name text NOT NULL DEFAULT 'Your Company Name',
    brand_name text,
    tagline text,
    address_line1 text,
    address_line2 text,
    city text,
    postal_code text,
    country text DEFAULT 'Indonesia',
    email text,
    phone text,
    website text,
    bank_name text,
    bank_account_number text,
    bank_account_holder text,
    npwp text,
    logo_url text,
    primary_color text DEFAULT '#059669',
    default_proposal_terms text,
    default_payment_terms text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT singleton_check CHECK (id = 1)
);

-- ===== audit_logs =====
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid,
    action text NOT NULL,
    actor_id uuid,
    actor_email text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO company_settings (
  id,
  legal_name,
  brand_name,
  tagline,
  city,
  country,
  email,
  default_payment_terms
) VALUES (
  1,
  'PT. Inovasi Langkah Usaha',
  'Ilusa',
  'Budget Controlling & Partnership Operations',
  'Yogyakarta',
  'Indonesia',
  'partnership@ilusa.id',
  'Please use the invoice number as payment reference and confirm payment to partnership@ilusa.id.'
) ON CONFLICT (id) DO UPDATE SET
  legal_name = COALESCE(company_settings.legal_name, EXCLUDED.legal_name),
  brand_name = COALESCE(company_settings.brand_name, EXCLUDED.brand_name),
  tagline = COALESCE(company_settings.tagline, EXCLUDED.tagline),
  city = COALESCE(company_settings.city, EXCLUDED.city),
  country = COALESCE(company_settings.country, EXCLUDED.country),
  email = COALESCE(company_settings.email, EXCLUDED.email),
  default_payment_terms = COALESCE(company_settings.default_payment_terms, EXCLUDED.default_payment_terms);


-- ===== 2. Indexes =====
CREATE INDEX IF NOT EXISTS idx_engagements_client_id ON engagements(client_id);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);

CREATE INDEX IF NOT EXISTS idx_invoices_engagement_id ON invoices(engagement_id);
CREATE INDEX IF NOT EXISTS idx_invoices_billing_month ON invoices(billing_month);
CREATE INDEX IF NOT EXISTS idx_invoices_period_month ON invoices(period_month);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_date ON invoice_payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_client_advances_client_id ON client_advances(client_id);
CREATE INDEX IF NOT EXISTS idx_client_advances_period_month ON client_advances(period_month);
CREATE INDEX IF NOT EXISTS idx_client_advances_status ON client_advances(status);
CREATE INDEX IF NOT EXISTS idx_client_advances_spend_date ON client_advances(spend_date DESC);

CREATE INDEX IF NOT EXISTS idx_freelancer_fees_freelancer_id ON freelancer_fees(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_fees_engagement_id ON freelancer_fees(engagement_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_fees_period_month ON freelancer_fees(period_month);
CREATE INDEX IF NOT EXISTS idx_freelancer_fees_status ON freelancer_fees(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_proposals_client ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_number ON proposals(proposal_number);

CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_service ON proposal_items(service_id);

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_ref ON documents(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(generated_at DESC);


-- ===== 3. Updated_at Triggers & Auto-Recalculations =====

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger clients
DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger freelancers
DROP TRIGGER IF EXISTS trg_freelancers_updated_at ON freelancers;
CREATE TRIGGER trg_freelancers_updated_at BEFORE UPDATE ON freelancers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger engagements
DROP TRIGGER IF EXISTS trg_engagements_updated_at ON engagements;
CREATE TRIGGER trg_engagements_updated_at BEFORE UPDATE ON engagements FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger invoices
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger client_advances
DROP TRIGGER IF EXISTS trg_client_advances_updated_at ON client_advances;
CREATE TRIGGER trg_client_advances_updated_at BEFORE UPDATE ON client_advances FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger freelancer_fees
DROP TRIGGER IF EXISTS trg_freelancer_fees_updated_at ON freelancer_fees;
CREATE TRIGGER trg_freelancer_fees_updated_at BEFORE UPDATE ON freelancer_fees FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger proposals
DROP TRIGGER IF EXISTS proposals_set_updated_at ON proposals;
CREATE TRIGGER proposals_set_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ===== Auto-update proposals.total_amount when items change =====
CREATE OR REPLACE FUNCTION recalculate_proposal_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE proposals
  SET total_amount = COALESCE((
    SELECT SUM(subtotal) FROM proposal_items 
    WHERE proposal_id = COALESCE(NEW.proposal_id, OLD.proposal_id)
  ), 0)
  WHERE id = COALESCE(NEW.proposal_id, OLD.proposal_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposal_items_recalc ON proposal_items;
CREATE TRIGGER proposal_items_recalc
  AFTER INSERT OR UPDATE OR DELETE ON proposal_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_proposal_total();


-- ===== Auto-generate proposal_number on insert =====
CREATE OR REPLACE FUNCTION generate_proposal_number()
RETURNS TRIGGER AS $$
DECLARE
  current_yearmonth text;
  next_seq integer;
BEGIN
  IF NEW.proposal_number IS NULL OR NEW.proposal_number = '' THEN
    current_yearmonth := to_char(now(), 'YYYYMM');
    
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(proposal_number FROM 'PROP-' || current_yearmonth || '-(\d+)') AS integer)
    ), 0) + 1
    INTO next_seq
    FROM proposals
    WHERE proposal_number LIKE 'PROP-' || current_yearmonth || '-%';
    
    NEW.proposal_number := 'PROP-' || current_yearmonth || '-' || LPAD(next_seq::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposals_auto_number ON proposals;
CREATE TRIGGER proposals_auto_number
  BEFORE INSERT ON proposals
  FOR EACH ROW EXECUTE FUNCTION generate_proposal_number();


-- ===== 4. Row Level Security & Policies =====
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissive Policies for Authenticated Users
DROP POLICY IF EXISTS clients_authenticated_all ON clients;
CREATE POLICY clients_authenticated_all ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS freelancers_authenticated_all ON freelancers;
CREATE POLICY freelancers_authenticated_all ON freelancers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS services_authenticated_all ON services;
CREATE POLICY services_authenticated_all ON services FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS engagements_authenticated_all ON engagements;
CREATE POLICY engagements_authenticated_all ON engagements FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS invoices_authenticated_all ON invoices;
CREATE POLICY invoices_authenticated_all ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS invoice_payments_authenticated_all ON invoice_payments;
CREATE POLICY invoice_payments_authenticated_all ON invoice_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS client_advances_authenticated_all ON client_advances;
CREATE POLICY client_advances_authenticated_all ON client_advances FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS freelancer_fees_authenticated_all ON freelancer_fees;
CREATE POLICY freelancer_fees_authenticated_all ON freelancer_fees FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS proposals_authenticated_all ON proposals;
CREATE POLICY proposals_authenticated_all ON proposals FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS proposal_items_authenticated_all ON proposal_items;
CREATE POLICY proposal_items_authenticated_all ON proposal_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS documents_authenticated_all ON documents;
CREATE POLICY documents_authenticated_all ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS company_settings_authenticated_all ON company_settings;
CREATE POLICY company_settings_authenticated_all ON company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS audit_logs_authenticated_all ON audit_logs;
CREATE POLICY audit_logs_authenticated_all ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ===== 5. Views =====

-- ===== View: invoices dengan computed payment fields =====
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_month text;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'approved', 'sent', 'paid'));
ALTER TABLE freelancer_fees DROP CONSTRAINT IF EXISTS freelancer_fees_status_check;
ALTER TABLE freelancer_fees ADD CONSTRAINT freelancer_fees_status_check CHECK (status IN ('pending', 'approved', 'paid'));
UPDATE invoices
SET billing_month = to_char(issue_date, 'YYYY-MM')
WHERE billing_month IS NULL AND issue_date IS NOT NULL;

CREATE OR REPLACE VIEW invoices_with_payments AS
SELECT 
  i.*,
  COALESCE(i.billing_month, to_char(i.issue_date, 'YYYY-MM')) AS effective_billing_month,
  COALESCE(p.total_paid, 0) AS total_paid,
  (i.amount - COALESCE(p.total_paid, 0)) AS balance,
  p.payment_count,
  p.last_payment_date,
  CASE
    WHEN i.status = 'draft' THEN 'draft'
    WHEN COALESCE(p.total_paid, 0) >= i.amount THEN 'paid'
    WHEN COALESCE(p.total_paid, 0) > 0 THEN 'partial'
    WHEN i.status = 'approved' THEN 'approved'
    WHEN i.due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'sent'
  END AS computed_status
FROM invoices i
LEFT JOIN (
  SELECT 
    invoice_id,
    SUM(amount) AS total_paid,
    COUNT(*) AS payment_count,
    MAX(payment_date) AS last_payment_date
  FROM invoice_payments
  GROUP BY invoice_id
) p ON p.invoice_id = i.id;


-- ===== 6. Seed Data =====
INSERT INTO services (name, service_type, fee_type) VALUES
    ('Branding LinkedIn Personal', 'one_time', 'fixed'),
    ('Branding LinkedIn Business', 'one_time', 'fixed'),
    ('Branding LinkedIn Personal & Business', 'one_time', 'fixed'),
    ('Optimasi Market Place Shopee', 'monthly', 'fixed'),
    ('Optimasi Market Place TikTok', 'monthly', 'fixed'),
    ('Optimasi Google Maps', 'one_time', 'fixed'),
    ('Optimasi App Rate Google Play', 'one_time', 'fixed'),
    ('Optimasi App Rate Apps Store', 'one_time', 'fixed'),
    ('Market Research', 'one_time', 'fixed'),
    ('Inbound / Outbound Sales', 'monthly', 'hourly'),
    ('Content Production', 'monthly', 'per_content'),
    ('Digital Marketing', 'monthly', 'fixed'),
    ('Outsource Service', 'monthly', 'hourly'),
    ('Monthly Service', 'monthly', 'fixed')
ON CONFLICT (name, service_type) DO NOTHING;

INSERT INTO freelancers (name, specialization, default_hourly_rate, status) VALUES
    ('Putri', 'Inbound / Outbound Sales', 17000, 'active'),
    ('Pandu', 'Inbound / Outbound Sales', 17000, 'active'),
    ('Hari', 'Digital Marketing', 17000, 'active'),
    ('Robi', 'Content Production', 17000, 'active'),
    ('Marta', 'Inbound / Outbound Sales', 17000, 'active'),
    ('Danang', 'Outsource Service', 17000, 'active'),
    ('Fandi', 'Branding LinkedIn Personal', 17000, 'active'),
    ('Reza', 'Optimasi Market Place', 17000, 'active'),
    ('Wira', 'General Support', 17000, 'active'),
    ('Khansa', 'Branding LinkedIn', 17000, 'active'),
    ('Abram', 'General Support', 17000, 'active')
ON CONFLICT (name) DO NOTHING;


-- ===== 7. Legacy Data Migration backfill =====
-- Backfill payment records for historical invoices marked paid in client legacy tables
INSERT INTO invoice_payments (invoice_id, amount, payment_date, notes)
SELECT id, amount, COALESCE(paid_date, issue_date), 'Migrated from legacy mark-as-paid'
FROM invoices
WHERE status = 'paid' 
  AND NOT EXISTS (SELECT 1 FROM invoice_payments WHERE invoice_id = invoices.id)
ON CONFLICT DO NOTHING;
