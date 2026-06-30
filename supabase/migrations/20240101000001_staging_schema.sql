-- Import Jobs (Auditoría de cada archivo PDF subido)
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Quién subió el archivo
    filename TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'review_required', 'completed', 'failed')),
    total_records INTEGER DEFAULT 0,
    new_records INTEGER DEFAULT 0,
    updated_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    log_output TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Staging Records (Datos extraídos del PDF en crudo, listos para diffing)
CREATE TABLE staging_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Raw parsed text fields
    raw_brand TEXT,
    raw_vendor_code TEXT,
    raw_client_code TEXT,
    raw_client_name TEXT,
    raw_client_identifier TEXT,
    raw_client_locality TEXT,
    raw_client_address TEXT,
    raw_invoice_number TEXT,
    raw_issue_date DATE,
    raw_due_date DATE,
    raw_original_amount DECIMAL(12,2),
    raw_balance_amount DECIMAL(12,2),
    raw_payment_amount DECIMAL(12,2),
    raw_credit_note_amount DECIMAL(12,2),
    raw_observations TEXT,

    -- Diffing Status
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'valid', 'duplicate', 'conflict', 'error')),
    action_required TEXT CHECK (action_required IN ('insert', 'update', 'ignore', 'manual_resolution')),
    error_message TEXT,

    -- Matched Foreign Keys (if found in DB)
    matched_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    matched_brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    matched_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    matched_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view import jobs of their company"
ON import_jobs FOR SELECT
USING (company_id = (SELECT company_id FROM users WHERE users.id = auth.uid()));

CREATE POLICY "Users can view staging records of their company"
ON staging_records FOR SELECT
USING (company_id = (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- RPC para Commit a Producción (Se ejecutará cuando el usuario confirme el Preview)
-- Este es un borrador estructural, la lógica compleja en PL/pgSQL iterará sobre staging_records
CREATE OR REPLACE FUNCTION commit_import_job(job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Insertar Marcas nuevas
    INSERT INTO brands (company_id, name)
    SELECT DISTINCT company_id, raw_brand FROM staging_records 
    WHERE import_job_id = job_id AND processing_status = 'valid' AND matched_brand_id IS NULL AND raw_brand IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- 2. Insertar Vendedores nuevos
    INSERT INTO vendors (company_id, vendor_code, name)
    SELECT DISTINCT company_id, raw_vendor_code, 'Vendor ' || raw_vendor_code FROM staging_records
    WHERE import_job_id = job_id AND processing_status = 'valid' AND matched_vendor_id IS NULL AND raw_vendor_code IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- 3. Insertar Clientes nuevos
    INSERT INTO clients (company_id, client_code, name, identifier, locality, address)
    SELECT DISTINCT company_id, raw_client_code, raw_client_name, raw_client_identifier, raw_client_locality, raw_client_address FROM staging_records
    WHERE import_job_id = job_id AND processing_status = 'valid' AND matched_client_id IS NULL AND raw_client_code IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- 4. Actualizar Matched IDs en Staging basándonos en lo que acabamos de insertar
    UPDATE staging_records s
    SET matched_brand_id = b.id
    FROM brands b
    WHERE s.import_job_id = job_id AND s.raw_brand = b.name AND s.company_id = b.company_id AND s.matched_brand_id IS NULL;

    UPDATE staging_records s
    SET matched_vendor_id = v.id
    FROM vendors v
    WHERE s.import_job_id = job_id AND s.raw_vendor_code = v.vendor_code AND s.company_id = v.company_id AND s.matched_vendor_id IS NULL;

    UPDATE staging_records s
    SET matched_client_id = c.id
    FROM clients c
    WHERE s.import_job_id = job_id AND s.raw_client_code = c.client_code AND s.company_id = c.company_id AND s.matched_client_id IS NULL;

    -- 5. Insertar Facturas (Invoices) nuevas
    INSERT INTO invoices (company_id, client_id, brand_id, vendor_id, invoice_number, issue_date, due_date, original_amount, balance_amount, observations)
    SELECT company_id, matched_client_id, matched_brand_id, matched_vendor_id, raw_invoice_number, raw_issue_date, raw_due_date, raw_original_amount, raw_balance_amount, raw_observations
    FROM staging_records
    WHERE import_job_id = job_id AND processing_status = 'valid' AND action_required = 'insert' AND matched_client_id IS NOT NULL
    ON CONFLICT (company_id, client_id, invoice_number) DO UPDATE
    SET balance_amount = EXCLUDED.balance_amount, updated_at = now();

    -- (Pendiente: Lógica de Pagos y Notas de Crédito, y manejo estricto de Errores)
    
    -- 6. Marcar Job como completado
    UPDATE import_jobs SET status = 'completed', completed_at = now() WHERE id = job_id;
END;
$$;
