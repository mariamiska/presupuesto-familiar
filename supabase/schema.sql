-- ============================================================
-- PRESUPUESTO FAMILIAR — Schema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Personas / grupos familiares
create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  color text not null default '#2C3E50',
  tipo text not null check (tipo in ('Persona', 'Grupo')),
  activa boolean not null default true,
  created_at timestamptz default now()
);

-- Conceptos / categorías de gasto
create table if not exists conceptos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  persona_id uuid references personas(id),
  es_fijo boolean default false,
  cuota_total int,
  cuota_actual int,
  created_at timestamptz default now(),
  unique(nombre, persona_id)
);

-- Ingresos planificados
create table if not exists ingresos (
  id uuid primary key default gen_random_uuid(),
  mes int not null check (mes between 1 and 12),
  anio int not null default 2026,
  concepto text not null,
  persona_id uuid references personas(id),
  monto numeric(15,0) not null default 0,
  created_at timestamptz default now()
);

-- Presupuesto planificado
create table if not exists presupuesto (
  id uuid primary key default gen_random_uuid(),
  mes int not null check (mes between 1 and 12),
  anio int not null default 2026,
  concepto_id uuid references conceptos(id),
  monto_planificado numeric(15,0) not null default 0,
  notas text,
  created_at timestamptz default now()
);

-- Gastos reales
create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  concepto_id uuid references conceptos(id),
  persona_id uuid references personas(id),
  monto numeric(15,0) not null,
  nota text,
  fuente text not null default 'manual' check (fuente in ('manual', 'whatsapp', 'ocr', 'email')),
  factura_url text,
  pendiente_confirmacion boolean default false,
  registrado_por text,
  created_at timestamptz default now()
);

-- Facturas / comprobantes OCR
create table if not exists facturas (
  id uuid primary key default gen_random_uuid(),
  gasto_id uuid references gastos(id) on delete cascade,
  url text not null,
  texto_extraido text,
  datos_ocr jsonb,
  created_at timestamptz default now()
);

-- Deudas (préstamos y tarjetas)
create table if not exists deudas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('prestamo', 'tarjeta', 'otra')),
  persona_id uuid references personas(id),
  capital_inicial numeric(15,0),
  saldo_actual numeric(15,0) not null,
  tasa_anual numeric(5,2),
  cuota_mensual numeric(15,0),
  cuotas_totales int,
  cuotas_pagadas int default 0,
  fecha_vencimiento date,
  activa boolean default true,
  created_at timestamptz default now()
);

-- ── Seed de personas ──────────────────────────────────────
insert into personas (nombre, color, tipo) values
  ('Augusto', '#2980B9', 'Persona'),
  ('Miska',   '#27AE60', 'Persona'),
  ('Niños',   '#F39C12', 'Grupo'),
  ('Casa',    '#D35400', 'Grupo'),
  ('Familia', '#8E44AD', 'Grupo')
on conflict (nombre) do nothing;

-- ── Indexes ───────────────────────────────────────────────
create index if not exists idx_gastos_fecha on gastos(fecha);
create index if not exists idx_gastos_persona on gastos(persona_id);
create index if not exists idx_presupuesto_mes_anio on presupuesto(mes, anio);
create index if not exists idx_ingresos_mes_anio on ingresos(mes, anio);

-- ── RLS básico (habilitar en Supabase Dashboard también) ──
alter table personas   enable row level security;
alter table conceptos  enable row level security;
alter table ingresos   enable row level security;
alter table presupuesto enable row level security;
alter table gastos     enable row level security;
alter table facturas   enable row level security;
alter table deudas     enable row level security;

-- Política permisiva para usuarios autenticados (familia comparte todo)
create policy "familia_lee_todo" on personas   for select using (auth.role() = 'authenticated');
create policy "familia_lee_todo" on conceptos  for select using (auth.role() = 'authenticated');
create policy "familia_lee_todo" on ingresos   for select using (auth.role() = 'authenticated');
create policy "familia_lee_todo" on presupuesto for select using (auth.role() = 'authenticated');
create policy "familia_lee_todo" on gastos     for select using (auth.role() = 'authenticated');
create policy "familia_lee_todo" on facturas   for select using (auth.role() = 'authenticated');
create policy "familia_lee_todo" on deudas     for select using (auth.role() = 'authenticated');

create policy "familia_escribe" on gastos      for all using (auth.role() = 'authenticated');
create policy "familia_escribe" on facturas    for all using (auth.role() = 'authenticated');
create policy "familia_escribe" on deudas      for all using (auth.role() = 'authenticated');
create policy "familia_escribe" on ingresos    for all using (auth.role() = 'authenticated');
create policy "familia_escribe" on conceptos   for all using (auth.role() = 'authenticated');
create policy "familia_escribe" on presupuesto for all using (auth.role() = 'authenticated');

-- Migración: tipo de recurrencia en gastos
-- Ejecutar en Supabase Dashboard → SQL Editor
alter table gastos add column if not exists tipo_recurrencia text check (tipo_recurrencia in ('suscripcion', 'fijo'));
create index if not exists idx_gastos_tipo_recurrencia on gastos(tipo_recurrencia) where tipo_recurrencia is not null;
