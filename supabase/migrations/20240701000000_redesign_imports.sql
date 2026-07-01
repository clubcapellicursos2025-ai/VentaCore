-- ==============================================================================
-- Rediseño del Módulo de Importación de Cuentas Corrientes
-- ==============================================================================

-- 1. Modificar tabla Clients
-- Remover la constraint UNIQUE de client_code para permitir consolidación
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_company_id_client_code_key;

-- Añadir nuevos campos de identificación y consolidación
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS dni TEXT,
ADD COLUMN IF NOT EXISTS cuit_cuil TEXT,
ADD COLUMN IF NOT EXISTS origin_codes JSONB DEFAULT '[]'::jsonb;

-- Crear un índice compuesto para búsqueda rápida en consolidación
CREATE INDEX IF NOT EXISTS idx_clients_identifier_dni_cuit ON clients (identifier, dni, cuit_cuil);

-- 2. Modificar tabla Invoices
-- Añadir campos para trazar el origen de cada factura
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS import_job_id UUID REFERENCES import_jobs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS origin_brand TEXT,
ADD COLUMN IF NOT EXISTS internal_code TEXT,
ADD COLUMN IF NOT EXISTS internal_indicator TEXT,
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'Factura',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true; -- Para marcar facturas pagadas/eliminadas lógicamente

-- Remover la constraint UNIQUE de invoice_number si dependía de una lógica más simple
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_company_id_client_id_invoice_number_key;
-- Agregar nueva constraint que contemple el origen para no sobreescribir entre marcas
ALTER TABLE invoices ADD CONSTRAINT invoices_unique_origin_number UNIQUE (company_id, client_id, invoice_number, origin_brand);

-- 3. Modificar tabla Vendors
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'unassigned'));

-- 4. Modificar tabla Import Jobs
ALTER TABLE import_jobs
ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'resumen_cuenta',
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_balance DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_clients INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_invoices INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS errors JSONB DEFAULT '[]'::jsonb;

-- 5. Crear Vendedor por Defecto (PENDIENTE DE ASIGNACIÓN)
-- Esto se insertará dinámicamente desde el código de la aplicación (en el import action) 
-- si no existe, ya que requiere el company_id de la sesión.
