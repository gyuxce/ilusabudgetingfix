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

CREATE INDEX IF NOT EXISTS idx_client_advances_client_id ON client_advances(client_id);
CREATE INDEX IF NOT EXISTS idx_client_advances_period_month ON client_advances(period_month);
CREATE INDEX IF NOT EXISTS idx_client_advances_status ON client_advances(status);
CREATE INDEX IF NOT EXISTS idx_client_advances_spend_date ON client_advances(spend_date DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_advances_updated_at ON client_advances;
CREATE TRIGGER trg_client_advances_updated_at
BEFORE UPDATE ON client_advances
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE client_advances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_advances_authenticated_all ON client_advances;
CREATE POLICY client_advances_authenticated_all
ON client_advances
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
