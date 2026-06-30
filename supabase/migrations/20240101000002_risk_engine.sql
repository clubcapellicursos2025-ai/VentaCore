-- Vista para consolidar la deuda total por cliente
CREATE OR REPLACE VIEW vw_client_debt_summary AS
SELECT 
    c.id AS client_id,
    c.company_id,
    c.global_credit_limit,
    
    -- Calcular deuda total (sumatoria de saldos de todas las facturas)
    COALESCE(SUM(i.balance_amount), 0) AS total_debt,
    
    -- Calcular deuda vencida (solo facturas con fecha de vencimiento menor a HOY)
    COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE THEN i.balance_amount ELSE 0 END), 0) AS overdue_debt,
    
    -- Calcular la cantidad de días del mayor atraso
    COALESCE(MAX(CURRENT_DATE - i.due_date) FILTER (WHERE i.due_date < CURRENT_DATE AND i.balance_amount > 0), 0) AS max_overdue_days,

    -- Factura más antigua sin pagar
    MIN(i.due_date) FILTER (WHERE i.balance_amount > 0) AS oldest_unpaid_invoice_date

FROM clients c
LEFT JOIN invoices i ON c.id = i.client_id
GROUP BY c.id, c.company_id, c.global_credit_limit;


-- Función RPC para calcular el Semáforo de Riesgo (Risk Engine)
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
    v_status TEXT;
BEGIN
    -- Obtener métricas del cliente desde la vista
    SELECT total_debt, overdue_debt, max_overdue_days, global_credit_limit
    INTO v_total_debt, v_overdue_debt, v_max_overdue_days, v_credit_limit
    FROM vw_client_debt_summary
    WHERE client_id = p_client_id;

    -- Si no existe el cliente, devolver error o gris
    IF NOT FOUND THEN
        RETURN 'unknown';
    END IF;

    -- Lógica del Semáforo (Basada en las reglas del plan maestro):
    
    -- 1. ROJO: Atraso severo (> 30 días) o límite global excedido.
    IF v_max_overdue_days > 30 OR (v_credit_limit > 0 AND v_total_debt > v_credit_limit) THEN
        RETURN 'red';
    END IF;

    -- 2. AMARILLO: Atraso leve (> 0 y <= 30 días) o crédito disponible crítico (< 20%).
    IF v_max_overdue_days > 0 OR (v_credit_limit > 0 AND v_total_debt > (v_credit_limit * 0.80)) THEN
        RETURN 'yellow';
    END IF;

    -- 3. VERDE: Al día y con crédito disponible saludable.
    RETURN 'green';
END;
$$;
