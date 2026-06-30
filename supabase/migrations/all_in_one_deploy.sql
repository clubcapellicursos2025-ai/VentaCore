-- =========================================================================
-- VENTACORE MVP - CONSOLIDATED DEPLOYMENT SCRIPT
-- =========================================================================
-- Copia y pega todo este script en el SQL Editor de tu panel de Supabase.
-- Ejecútalo para crear las tablas, el Motor de Riesgo y el Staging Area.
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES (Tenants)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. REGIONS
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, name)
);

-- 3. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'vendor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. VENDORS
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    vendor_code TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, vendor_code)
);

-- 5. BRANDS
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, name)
);

-- 6. CLIENTS
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    client_code TEXT NOT NULL,
    name TEXT NOT NULL,
    identifier TEXT,
    locality TEXT,
    address TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'inactive')),
    global_credit_limit DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, client_code)
);

-- 7. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    original_amount DECIMAL(12,2) NOT NULL,
    balance_amount DECIMAL(12,2) NOT NULL,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, client_id, invoice_number)
);

-- 8. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. CREDIT NOTES
CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- STAGING & PIPELINE TABLES
-- =========================================================================

-- 10. IMPORT JOBS
CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
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

-- 11. STAGING RECORDS
CREATE TABLE IF NOT EXISTS staging_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
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

    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'valid', 'duplicate', 'conflict', 'error')),
    action_required TEXT CHECK (action_required IN ('insert', 'update', 'ignore', 'manual_resolution')),
    error_message TEXT,

    matched_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    matched_brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    matched_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    matched_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- RISK ENGINE (VIEWS & RPC)
-- =========================================================================

-- 12. CLIENT DEBT SUMMARY VIEW
CREATE OR REPLACE VIEW vw_client_debt_summary AS
SELECT 
    c.id AS client_id,
    c.company_id,
    c.global_credit_limit,
    COALESCE(SUM(i.balance_amount), 0) AS total_debt,
    COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE THEN i.balance_amount ELSE 0 END), 0) AS overdue_debt,
    COALESCE(MAX(CURRENT_DATE - i.due_date) FILTER (WHERE i.due_date < CURRENT_DATE AND i.balance_amount > 0), 0) AS max_overdue_days,
    MIN(i.due_date) FILTER (WHERE i.balance_amount > 0) AS oldest_unpaid_invoice_date
FROM clients c
LEFT JOIN invoices i ON c.id = i.client_id
GROUP BY c.id, c.company_id, c.global_credit_limit;

-- 13. RISK STATUS FUNCTION
CREATE OR REPLACE FUNCTION get_client_risk_status(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_debt DECIMAL;
    v_overdue_debt DECIMAL;
    v_max_overdue_days INTEGER;
    v_credit_limit DECIMAL;
BEGIN
    SELECT total_debt, overdue_debt, max_overdue_days, global_credit_limit
    INTO v_total_debt, v_overdue_debt, v_max_overdue_days, v_credit_limit
    FROM vw_client_debt_summary
    WHERE client_id = p_client_id;

    IF NOT FOUND THEN RETURN 'unknown'; END IF;

    IF v_max_overdue_days > 30 OR (v_credit_limit > 0 AND v_total_debt > v_credit_limit) THEN RETURN 'red'; END IF;
    IF v_max_overdue_days > 0 OR (v_credit_limit > 0 AND v_total_debt > (v_credit_limit * 0.80)) THEN RETURN 'yellow'; END IF;
    
    RETURN 'green';
END;
$$;

-- 14. COMMIT IMPORT RPC
CREATE OR REPLACE FUNCTION commit_import_job(job_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO brands (company_id, name)
    SELECT DISTINCT company_id, raw_brand FROM staging_records 
    WHERE import_job_id = job_id AND processing_status = 'valid' AND matched_brand_id IS NULL AND raw_brand IS NOT NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO vendors (company_id, vendor_code, name)
    SELECT DISTINCT company_id, raw_vendor_code, 'Vendor ' || raw_vendor_code FROM staging_records
    WHERE import_job_id = job_id AND processing_status = 'valid' AND matched_vendor_id IS NULL AND raw_vendor_code IS NOT NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO clients (company_id, client_code, name, identifier, locality, address)
    SELECT DISTINCT company_id, raw_client_code, raw_client_name, raw_client_identifier, raw_client_locality, raw_client_address FROM staging_records
    WHERE import_job_id = job_id AND processing_status = 'valid' AND matched_client_id IS NULL AND raw_client_code IS NOT NULL
    ON CONFLICT DO NOTHING;

    UPDATE staging_records s SET matched_brand_id = b.id FROM brands b WHERE s.import_job_id = job_id AND s.raw_brand = b.name AND s.company_id = b.company_id AND s.matched_brand_id IS NULL;
    UPDATE staging_records s SET matched_vendor_id = v.id FROM vendors v WHERE s.import_job_id = job_id AND s.raw_vendor_code = v.vendor_code AND s.company_id = v.company_id AND s.matched_vendor_id IS NULL;
    UPDATE staging_records s SET matched_client_id = c.id FROM clients c WHERE s.import_job_id = job_id AND s.raw_client_code = c.client_code AND s.company_id = c.company_id AND s.matched_client_id IS NULL;

    INSERT INTO invoices (company_id, client_id, brand_id, vendor_id, invoice_number, issue_date, due_date, original_amount, balance_amount, observations)
    SELECT company_id, matched_client_id, matched_brand_id, matched_vendor_id, raw_invoice_number, raw_issue_date, raw_due_date, raw_original_amount, raw_balance_amount, raw_observations
    FROM staging_records
    WHERE import_job_id = job_id AND processing_status = 'valid' AND action_required = 'insert' AND matched_client_id IS NOT NULL
    ON CONFLICT (company_id, client_id, invoice_number) DO UPDATE
    SET balance_amount = EXCLUDED.balance_amount, updated_at = now();
    
    UPDATE import_jobs SET status = 'completed', completed_at = now() WHERE id = job_id;
END;
$$;
