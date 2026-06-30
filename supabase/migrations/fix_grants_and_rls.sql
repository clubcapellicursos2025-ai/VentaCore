-- ==============================================================================
-- FIX GRANTS & RLS SCRIPT - VENTACORE
-- Copia y pega esto en el SQL Editor de Supabase y dale a Run.
-- ==============================================================================

-- 1. Asegurar que los roles de la API (anon, authenticated, service_role)
--    tengan permisos básicos a nivel de esquema y tabla (GRANTS).
--    "Permission denied for table" suele ser por falta de estos GRANTS, no de RLS.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Desactivar RLS por completo para el MVP (la forma más rápida y segura para probar)
--    Esto elimina el Row Level Security, confiando únicamente en el código del servidor (Server Actions).
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE staging_records DISABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas residuales para que quede totalmente limpio
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON companies;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON import_jobs;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON staging_records;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON brands;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON vendors;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON credit_notes;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON regions;
