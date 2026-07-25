-- ============================================================
-- MIGRACIÓN: Introducción de tabla categorias
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Es segura y aditiva — no elimina ni modifica datos existentes
-- ============================================================

-- 1. Crear tabla categorias
-- ─────────────────────────────────────────────────────────────
create table if not exists categorias (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  icono  text not null default '❓',
  color  text not null default '#9ca3af',
  orden  int  not null default 99,
  created_at timestamptz default now()
);

alter table categorias enable row level security;
create policy "familia_lee_todo" on categorias for select using (auth.role() = 'authenticated');
create policy "familia_escribe"  on categorias for all    using (auth.role() = 'authenticated');

-- 2. Seed categorias (12 categorías fijas)
-- ─────────────────────────────────────────────────────────────
insert into categorias (nombre, icono, color, orden) values
  ('Alimentación',    '🍎', '#22c55e', 1),
  ('Vivienda',        '🏠', '#f97316', 2),
  ('Transporte',      '🚗', '#3b82f6', 3),
  ('Servicios',       '📱', '#eab308', 4),
  ('Salud',           '🏥', '#ef4444', 5),
  ('Escuela',         '🏫', '#8b5cf6', 6),
  ('Fútbol Niños',    '⚽', '#10b981', 7),
  ('Entretenimiento', '🎭', '#ec4899', 8),
  ('Ropa',            '👕', '#06b6d4', 9),
  ('Deudas',          '💳', '#64748b', 10),
  ('Regalos',         '🎁', '#f59e0b', 11),
  ('Otro',            '❓', '#9ca3af', 12)
on conflict (nombre) do nothing;

-- 3. Nuevas columnas en gastos
-- ─────────────────────────────────────────────────────────────
alter table gastos add column if not exists descripcion  text;
alter table gastos add column if not exists categoria_id uuid references categorias(id);

create index if not exists idx_gastos_categoria on gastos(categoria_id);

-- 4. Nueva columna en presupuesto (para futura planificación por categoría)
-- ─────────────────────────────────────────────────────────────
alter table presupuesto add column if not exists categoria_id uuid references categorias(id);

-- 5. Migrar descripcion desde conceptos.nombre
-- ─────────────────────────────────────────────────────────────
update gastos g
set descripcion = c.nombre
from conceptos c
where g.concepto_id = c.id
  and g.descripcion is null;

-- 6. Migrar categoria_id — primero todo queda en "Otro"
-- ─────────────────────────────────────────────────────────────
update gastos
set categoria_id = (select id from categorias where nombre = 'Otro')
where categoria_id is null;

-- 7. Reasignar por concepto (el order importa: más específico al final gana)
-- ─────────────────────────────────────────────────────────────

-- Alimentación
update gastos g
set categoria_id = (select id from categorias where nombre = 'Alimentación')
from conceptos c
where g.concepto_id = c.id
  and lower(c.nombre) in (
    'agua','bebedero','comida','súper','super',
    'cantina rafa','cantina sebas','chilui','comercial'
  );

-- Vivienda
update gastos g
set categoria_id = (select id from categorias where nombre = 'Vivienda')
from conceptos c
where g.concepto_id = c.id
  and lower(c.nombre) in (
    'expensas','basura','limpieza casa',
    'ferretería','ferreteria','luz casa papa'
  );

-- Transporte
update gastos g
set categoria_id = (select id from categorias where nombre = 'Transporte')
from conceptos c
where g.concepto_id = c.id
  and lower(c.nombre) in (
    'auto','combus','combustible aprox',
    'mantenimiento camio','seguro auto'
  );

-- Servicios
update gastos g
set categoria_id = (select id from categorias where nombre = 'Servicios')
from conceptos c
where g.concepto_id = c.id
  and lower(c.nombre) in (
    'claro','celu','internet tigo',
    'telefonía 1','telefonia 1','telefonía 2','telefonia 2',
    'apple','google','microsoft','star','mango',
    'tc netflix','tc spotify','tc ytoro country','tc crunchy'
  );

-- Salud
update gastos g
set categoria_id = (select id from categorias where nombre = 'Salud')
from conceptos c
where g.concepto_id = c.id
  and lower(c.nombre) in (
    'farmacia','seguro médico','seguro medico',
    'seguro niño','seguro nino','seguro niños','seguro ninos',
    'frenillo augus','frenillo sebas','frenillos','estudios prefrenillo'
  );

-- Escuela
update gastos g
set categoria_id = (select id from categorias where nombre = 'Escuela')
from conceptos c
where g.concepto_id = c.id
  and lower(c.nombre) in (
    'anualidad escuela','libros','libros rafa','libros sebas',
    'carpeta creativa','profe particular','universitaria'
  );

-- Fútbol Niños
update gastos g
set categoria_id = (select id from categorias where nombre = 'Fútbol Niños')
from conceptos c
where g.concepto_id = c.id
  and lower(c.nombre) in (
    'blanqui','botines','botines canilleras','champion sebas',
    'equipo niños','equipo ninos',
    'equipo práctica 50%','equipo practica 50%',
    'fútbol','futbol','futbol 2 partidos','partido','partidos'
  );

-- Entretenimiento
update gastos g
set categoria_id = (select id from categorias where nombre = 'Entretenimiento')
from conceptos c
where g.concepto_id = c.id
  and lower(c.nombre) in ('tatakae');

-- Ropa
update gastos g
set categoria_id = (select id from categorias where nombre = 'Ropa')
from conceptos c
where g.concepto_id = c.id
  and lower(c.nombre) in ('pijama','ropa rafa y maria','ropa sebas');

-- Deudas
update gastos g
set categoria_id = (select id from categorias where nombre = 'Deudas')
from conceptos c
where g.concepto_id = c.id
  and lower(c.nombre) in (
    'crediagil','fpj','fpj m','gnb','tc gnb',
    'iphone','mac',
    'tarjeta conti','tarjeta de credito','tarjeta de crédito',
    'tarjeta de credito pj','tarjeta de crédito pj',
    'tarjeta itau','tarjeta ueno',
    'ueno','ueno credito','ueno crédito',
    'prestamo brasil','préstamo auto','prestamo auto',
    'crédito universitaria','credito universitaria'
  );

-- Regalos
update gastos g
set categoria_id = (select id from categorias where nombre = 'Regalos')
from conceptos c
where g.concepto_id = c.id
  and lower(c.nombre) in (
    'agnese baby shower','cumple papache',
    'dia de la madre','día de la madre',
    'regalo día del maestro','regalo dia del maestro',
    'regalo iván','regalo ivan',
    'viaje mamá','viaje mama','unicentro'
  );

-- 8. Limpieza de conceptos duplicados
-- ─────────────────────────────────────────────────────────────

-- Fusionar "Seguro Niño" en "Seguro Niños"
do $$
declare
  id_nino   uuid;
  id_ninos  uuid;
begin
  select id into id_nino  from conceptos where lower(nombre) = 'seguro niño'  limit 1;
  select id into id_ninos from conceptos where lower(nombre) = 'seguro niños' limit 1;

  if id_nino is not null and id_ninos is not null then
    -- reasignar gastos al concepto correcto
    update gastos set concepto_id = id_ninos where concepto_id = id_nino;
    delete from conceptos where id = id_nino;
  elsif id_nino is not null then
    -- solo existe el viejo, renombrar
    update conceptos set nombre = 'Seguro Niños' where id = id_nino;
  end if;
end $$;

-- 9. Verificación — ejecutar para confirmar el resultado
-- ─────────────────────────────────────────────────────────────
-- select cat.nombre as categoria, count(*) as gastos, sum(g.monto) as total
-- from gastos g
-- join categorias cat on cat.id = g.categoria_id
-- group by cat.nombre
-- order by total desc;
