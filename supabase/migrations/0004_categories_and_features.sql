-- ==============================================================================
-- Migración 0004: Categorías de Gasto, Índices de Duplicados y Mejoras RF-13/20
-- ==============================================================================

-- 1. Agregar columna category a public.receipts
ALTER TABLE public.receipts
    ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT 'otros';

-- 2. Backfill inteligente de categorías para registros existentes
UPDATE public.receipts
SET category = CASE
    WHEN LOWER(merchant_name) ~ '(claro|altice|wind|edesur|edenorte|edeeste|caasd|coraasan|tech|lab|hosting|cloud|internet)' THEN 'servicios'
    WHEN LOWER(merchant_name) ~ '(farmacia|supermercado|sirena|nacional|jumbo|bravo|restaurante|cafe|cafeteria|comida|alimento|carrefour|ole)' THEN 'alimentos'
    WHEN LOWER(merchant_name) ~ '(texaco|shell|esso|total|sunix|isla|combustible|gasolina|gasoil|estacion)' THEN 'combustible'
    WHEN LOWER(merchant_name) ~ '(uber|taxi|indrive|peaje|pasaje|transporte|caribe tours|metro)' THEN 'transporte'
    WHEN LOWER(merchant_name) ~ '(papeleria|office|ccc|lama|ferreteria|impresora|cartucho|oficina)' THEN 'oficina'
    ELSE COALESCE(NULLIF(category, ''), 'otros')
END
WHERE category = 'otros';

-- 3. Índices de rendimiento para filtros por categoría y detección de duplicados
CREATE INDEX IF NOT EXISTS idx_receipts_category ON public.receipts(category);
CREATE INDEX IF NOT EXISTS idx_receipts_duplicate_check ON public.receipts(user_id, merchant_name, issue_date, total);
