-- ============================================================
-- MIGRACIÓN: Tabla de Tarjetas de Crédito y asociación a Gastos
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Crear tabla de tarjetas
create table if not exists tarjetas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,               -- Ej: "Visa Itaú", "Mastercard Continental"
  banco text not null,                -- Ej: "Itaú", "Continental", "GNB", "Ueno"
  persona_id uuid references personas(id), -- Titular de la tarjeta
  limite numeric(15,0) default 0,     -- Límite total de crédito de la tarjeta
  deuda_actual numeric(15,0) default 0, -- Saldo acumulado / adeudado
  activa boolean default true,
  created_at timestamptz default now()
);

-- RLS para tarjetas
alter table tarjetas enable row level security;
create policy "familia_lee_tarjetas" on tarjetas for select using (true);
create policy "familia_escribe_tarjetas" on tarjetas for all using (true);

-- 2. Agregar columna tarjeta_id a la tabla de gastos
alter table gastos add column if not exists tarjeta_id uuid references tarjetas(id);
create index if not exists idx_gastos_tarjeta on gastos(tarjeta_id) where tarjeta_id is not null;
