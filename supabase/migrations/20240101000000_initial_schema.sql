-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies (Tenants - ej. Distribuidoras dueñas del SaaS)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Regions (Zonas geográficas extraídas del PDF: S.M. TUCUMAN, SALTA, RAMAL, etc.)
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, name)
);

-- Users (Para login al SaaS)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'vendor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vendors (Vendedores extraídos del código 'Vd' en los PDFs, ej. VEND 1, VEND 4)
-- Se separan de users porque un vendedor del PDF puede no tener usuario aún, 
-- pero el sistema necesita registrar su deuda.
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Opcional, si tiene acceso
    vendor_code TEXT NOT NULL, -- ej. "1", "4", "26"
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, vendor_code)
);

-- Brands (Marcas extraídas de las filas: Wella, Sow, Farmavi, Loreal, Matrix)
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, name)
);

-- Clients (Ficha ampliada basándonos en el PDF)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    client_code TEXT NOT NULL, -- Nro. de cuenta en el PDF, ej. "10001"
    name TEXT NOT NULL, -- CLIENTE Ap y nombre
    identifier TEXT, -- CUIT o DNI, sacado del campo * AMBOS *
    locality TEXT, -- Localidad, ej. "S.M. TUCUMAN"
    address TEXT, -- Domicilio
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'inactive')),
    global_credit_limit DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, client_code)
);

-- Invoices (Facturas individuales extraídas de cada fila del PDF)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL, -- Columna 'Factura', ej. "A08000013"
    issue_date DATE NOT NULL, -- Columna 'Fecha', ej. "18/06/26"
    due_date DATE NOT NULL, -- Columna 'Vencimto', ej. "10/06/26"
    original_amount DECIMAL(12,2) NOT NULL, -- Columna 'Importe'
    balance_amount DECIMAL(12,2) NOT NULL, -- Columna 'Saldo'
    observations TEXT, -- Columna 'Observacion', ej. "4 00"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, client_id, invoice_number)
);

-- Payments (Pagos, para reflejar 'SuPago' y tener historial)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL, -- Asumido fecha actual de importación o UltPag
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Credit Notes (Notas de crédito, reflejan columna 'NCR')
CREATE TABLE credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Draft for MVP)
-- Companies: Users can only see their own company
CREATE POLICY "Users can view their own company"
ON companies FOR SELECT
USING (id = (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- Users: Users can see all users in their company
CREATE POLICY "Users can view users in same company"
ON users FOR SELECT
USING (company_id = (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- Regions: Users can see regions in their company
CREATE POLICY "Users can view regions in their company"
ON regions FOR SELECT
USING (company_id = (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- Vendors: Users can see vendors in their company
CREATE POLICY "Users can view vendors in their company"
ON vendors FOR SELECT
USING (company_id = (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- Brands: Users can see brands of their company
CREATE POLICY "Users can view brands in their company"
ON brands FOR SELECT
USING (company_id = (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- Clients: Users can see clients of their company
CREATE POLICY "Users can view clients in their company"
ON clients FOR SELECT
USING (company_id = (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- Invoices: Users can see invoices of their company
CREATE POLICY "Users can view invoices in their company"
ON invoices FOR SELECT
USING (company_id = (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- Payments: Users can see payments of their company
CREATE POLICY "Users can view payments in their company"
ON payments FOR SELECT
USING (company_id = (SELECT company_id FROM users WHERE users.id = auth.uid()));

-- Credit Notes: Users can see credit notes of their company
CREATE POLICY "Users can view credit notes in their company"
ON credit_notes FOR SELECT
USING (company_id = (SELECT company_id FROM users WHERE users.id = auth.uid()));
