-- 1. Agregar columna brand_codes JSONB a la tabla vendors
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS brand_codes JSONB DEFAULT '{}'::jsonb;

-- 2. Modificar check o valor por defecto en status si existe
ALTER TABLE vendors
DROP CONSTRAINT IF EXISTS vendors_status_check;

ALTER TABLE vendors
ADD CONSTRAINT vendors_status_check CHECK (status IN ('active', 'inactive', 'unassigned', 'vacant'));

-- 3. Índice para búsqueda en JSONB de brand_codes
CREATE INDEX IF NOT EXISTS idx_vendors_brand_codes ON vendors USING GIN (brand_codes);
