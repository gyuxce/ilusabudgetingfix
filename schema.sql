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
    name text NOT NULL UNIQUE,
    service_type text NOT NULL CHECK (service_type IN ('monthly', 'one_time')),
    fee_type text NOT NULL CHECK (fee_type IN ('hourly', 'per_content', 'fixed')),
    created_at timestamptz NOT NULL DEFAULT now()
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
    period_month text,
    invoice_number text,
    amount integer NOT NULL,
    issue_date date NOT NULL,
    due_date date NOT NULL,
    paid_date date,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
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
    fee_type text NOT NULL CHECK (fee_type IN ('hourly', 'per_content')),
    hourly_rate integer,
    hours_per_day numeric(4,2),
    working_days integer,
    off_days integer DEFAULT 0,
    rate_single_post integer,
    rate_carousel integer,
    rate_reels integer,
    qty_single_post integer DEFAULT 0,
    qty_carousel integer DEFAULT 0,
    qty_reels integer DEFAULT 0,
    calculated_fee integer GENERATED ALWAYS AS (
        CAST(
            CASE 
                WHEN fee_type = 'hourly' THEN 
                    COALESCE(hourly_rate, 0) * COALESCE(hours_per_day, 0) * (COALESCE(working_days, 0) - COALESCE(off_days, 0))
                WHEN fee_type = 'per_content' THEN 
                    (COALESCE(rate_single_post, 0) * COALESCE(qty_single_post, 0)) + 
                    (COALESCE(rate_carousel, 0) * COALESCE(qty_carousel, 0)) + 
                    (COALESCE(rate_reels, 0) * COALESCE(qty_reels, 0))
                ELSE 0
            END AS integer
        )
    ) STORED,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_date date,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_engagements_client_id ON engagements(client_id);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);

CREATE INDEX IF NOT EXISTS idx_invoices_engagement_id ON invoices(engagement_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period_month ON invoices(period_month);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_freelancer_fees_freelancer_id ON freelancer_fees(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_fees_engagement_id ON freelancer_fees(engagement_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_fees_period_month ON freelancer_fees(period_month);
CREATE INDEX IF NOT EXISTS idx_freelancer_fees_status ON freelancer_fees(status);

-- ===== Updated_at Triggers =====
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_freelancers_updated_at ON freelancers;
CREATE TRIGGER trg_freelancers_updated_at BEFORE UPDATE ON freelancers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_engagements_updated_at ON engagements;
CREATE TRIGGER trg_engagements_updated_at BEFORE UPDATE ON engagements FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_freelancer_fees_updated_at ON freelancer_fees;
CREATE TRIGGER trg_freelancer_fees_updated_at BEFORE UPDATE ON freelancer_fees FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== Row Level Security ======
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_fees ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS freelancer_fees_authenticated_all ON freelancer_fees;
CREATE POLICY freelancer_fees_authenticated_all ON freelancer_fees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== Seed Data =====
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
ON CONFLICT (name) DO NOTHING;

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

-- ===== Verification =====
SELECT 'clients' as table_name, count(*) from clients
UNION ALL
SELECT 'freelancers', count(*) from freelancers
UNION ALL
SELECT 'services', count(*) from services
UNION ALL
SELECT 'engagements', count(*) from engagements
UNION ALL
SELECT 'invoices', count(*) from invoices
UNION ALL
SELECT 'freelancer_fees', count(*) from freelancer_fees;
