-- ==============================================================================
-- FIX RLS SCRIPT V2 - VENTACORE (FULLY PERMISSIVE FOR AUTHENTICATED USERS)
-- Copia y pega esto en el SQL Editor de Supabase y dale a Run.
-- ==============================================================================

-- 1. Eliminar políticas anteriores para evitar conflictos
DROP POLICY IF EXISTS "Users can insert their own company" ON companies;
DROP POLICY IF EXISTS "Users can select their companies" ON companies;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can select their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Auth users can read brands" ON brands;
DROP POLICY IF EXISTS "Auth users can insert brands" ON brands;
DROP POLICY IF EXISTS "Auth users can update brands" ON brands;
DROP POLICY IF EXISTS "Auth users can read vendors" ON vendors;
DROP POLICY IF EXISTS "Auth users can insert vendors" ON vendors;
DROP POLICY IF EXISTS "Auth users can update vendors" ON vendors;
DROP POLICY IF EXISTS "Auth users can read clients" ON clients;
DROP POLICY IF EXISTS "Auth users can insert clients" ON clients;
DROP POLICY IF EXISTS "Auth users can update clients" ON clients;
DROP POLICY IF EXISTS "Auth users can read invoices" ON invoices;
DROP POLICY IF EXISTS "Auth users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Auth users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Users can do everything on import_jobs" ON import_jobs;
DROP POLICY IF EXISTS "Users can do everything on staging_records" ON staging_records;


-- 2. Habilitar control total para cualquier usuario logueado (TO authenticated)
--    Esto permite leer, insertar, actualizar y borrar (FOR ALL).
CREATE POLICY "Enable ALL for authenticated users" ON companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON import_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON staging_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON brands FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON credit_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated users" ON regions FOR ALL TO authenticated USING (true) WITH CHECK (true);
