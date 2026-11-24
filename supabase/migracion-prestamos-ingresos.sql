-- Un préstamo recibido entra a la cuenta pero no es ingreso: es deuda.
-- Marcarlo deja el "sobrante" del mes midiendo lo que de verdad se ganó.
alter table ingresos add column if not exists es_prestamo boolean not null default false;

comment on column ingresos.es_prestamo is
  'true = dinero recibido como préstamo. Se excluye del sobrante y del balance.';

update ingresos set es_prestamo = true
where (concepto ilike '%préstamo%' or concepto ilike '%prestamo%') and es_prestamo = false;
