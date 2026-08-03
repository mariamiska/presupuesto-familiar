-- ============================================================
-- MIGRACIÓN: Sistema de cuotas automáticas para tarjetas
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Nuevas columnas en gastos
alter table gastos add column if not exists es_cuota boolean default false;
alter table gastos add column if not exists cuota_num int;
alter table gastos add column if not exists compra_origen_id uuid references gastos(id) on delete cascade;
alter table gastos add column if not exists excluir_resumen boolean default false;

create index if not exists idx_gastos_origen on gastos(compra_origen_id) where compra_origen_id is not null;

-- 2. Migrar gastos existentes con cuotas (eran solo informativos, ahora los marcamos)
update gastos
set excluir_resumen = true
where cuotas_total is not null and cuotas_total > 1 and excluir_resumen = false;

-- Nota: las cuotas futuras de esos gastos hay que generarlas manualmente o via la app.
-- Los gastos marcados con excluir_resumen=true seguirán visibles pero no sumarán al total del mes.
