-- ==============================================================================
-- SECURITY HARDENING SCRIPT - VENTACORE
-- Cierra la brecha de seguridad y aplica Aislamiento Multitenant Estricto (RLS)
-- Copia y pega esto en el SQL Editor de Supabase y dale a Run.
-- ==============================================================================

-- 1. Eliminar todas las políticas permisivas previas
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

-- 2. Crear función segura para obtener el company_id del usuario actual sin causar bucles infinitos
-- SECURITY DEFINER asegura que esta función pase por alto RLS internamente al consultar 'users'.
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. Crear Políticas de Aislamiento Estricto (Tenant Isolation)
-- Esto restringe toda operación (SELECT, INSERT, UPDATE, DELETE) para que el usuario solo pueda
-- interactuar con registros que correspondan a su propia empresa.

-- Companies (el usuario solo puede ver y editar su propia empresa)
CREATE POLICY "Tenant Isolation: Companies" ON companies FOR ALL TO authenticated USING (id = public.get_auth_company_id()) WITH CHECK (id = public.get_auth_company_id());

-- Users (el usuario solo ve usuarios de su misma empresa)
CREATE POLICY "Tenant Isolation: Users" ON users FOR ALL TO authenticated USING (company_id = public.get_auth_company_id()) WITH CHECK (company_id = public.get_auth_company_id());

-- Regions
CREATE POLICY "Tenant Isolation: Regions" ON regions FOR ALL TO authenticated USING (company_id = public.get_auth_company_id()) WITH CHECK (company_id = public.get_auth_company_id());

-- Vendors
CREATE POLICY "Tenant Isolation: Vendors" ON vendors FOR ALL TO authenticated USING (company_id = public.get_auth_company_id()) WITH CHECK (company_id = public.get_auth_company_id());

-- Brands
CREATE POLICY "Tenant Isolation: Brands" ON brands FOR ALL TO authenticated USING (company_id = public.get_auth_company_id()) WITH CHECK (company_id = public.get_auth_company_id());

-- Clients
CREATE POLICY "Tenant Isolation: Clients" ON clients FOR ALL TO authenticated USING (company_id = public.get_auth_company_id()) WITH CHECK (company_id = public.get_auth_company_id());

-- Invoices
CREATE POLICY "Tenant Isolation: Invoices" ON invoices FOR ALL TO authenticated USING (company_id = public.get_auth_company_id()) WITH CHECK (company_id = public.get_auth_company_id());

-- Payments
CREATE POLICY "Tenant Isolation: Payments" ON payments FOR ALL TO authenticated USING (company_id = public.get_auth_company_id()) WITH CHECK (company_id = public.get_auth_company_id());

-- Credit Notes
CREATE POLICY "Tenant Isolation: Credit Notes" ON credit_notes FOR ALL TO authenticated USING (company_id = public.get_auth_company_id()) WITH CHECK (company_id = public.get_auth_company_id());

-- Import Jobs
CREATE POLICY "Tenant Isolation: Import Jobs" ON import_jobs FOR ALL TO authenticated USING (company_id = public.get_auth_company_id()) WITH CHECK (company_id = public.get_auth_company_id());

-- Staging Records
CREATE POLICY "Tenant Isolation: Staging Records" ON staging_records FOR ALL TO authenticated USING (company_id = public.get_auth_company_id()) WITH CHECK (company_id = public.get_auth_company_id());
