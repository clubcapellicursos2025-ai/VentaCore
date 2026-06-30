-- ==============================================================================
-- FIX RLS SCRIPT - VENTACORE
-- Copia y pega esto en el SQL Editor de Supabase y dale a Run.
-- Soluciona la recursión infinita y añade permisos de escritura para el MVP.
-- ==============================================================================

-- 1. Eliminar las políticas que causaron la recursión
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can view users in same company" ON users;
DROP POLICY IF EXISTS "Users can view regions in their company" ON regions;
DROP POLICY IF EXISTS "Users can view vendors in their company" ON vendors;
DROP POLICY IF EXISTS "Users can view brands in their company" ON brands;
DROP POLICY IF EXISTS "Users can view clients in their company" ON clients;
DROP POLICY IF EXISTS "Users can view invoices in their company" ON invoices;
DROP POLICY IF EXISTS "Users can view payments in their company" ON payments;
DROP POLICY IF EXISTS "Users can view credit notes in their company" ON credit_notes;

-- 2. Habilitar que un usuario autenticado pueda insertar su primera compañía y su usuario
CREATE POLICY "Users can insert their own company" ON companies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can select their companies" ON companies FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can select their own profile" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (id = auth.uid());

-- 3. Políticas para las tablas del Importador (Staging & Pipeline)
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can do everything on import_jobs" ON import_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can do everything on staging_records" ON staging_records FOR ALL USING (
    import_job_id IN (SELECT id FROM import_jobs WHERE user_id = auth.uid())
);

-- 4. Para simplificar el MVP, permitimos leer e insertar en las tablas oficiales 
-- si el usuario está autenticado (luego se afina con tenant isolation usando JWT).
CREATE POLICY "Auth users can read brands" ON brands FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can insert brands" ON brands FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users can update brands" ON brands FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users can read vendors" ON vendors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can insert vendors" ON vendors FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users can update vendors" ON vendors FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users can read clients" ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can insert clients" ON clients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users can update clients" ON clients FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users can read invoices" ON invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users can insert invoices" ON invoices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users can update invoices" ON invoices FOR UPDATE USING (auth.role() = 'authenticated');
