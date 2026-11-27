-- Marcar un gasto como ya pagado, para la planilla mensual de pagos.
alter table gastos add column if not exists pagado boolean not null default false;
alter table gastos add column if not exists pagado_at timestamptz;

comment on column gastos.pagado is 'true = ya se pagó. Lo marca la pantalla /pagos.';
create index if not exists idx_gastos_fecha_pagado on gastos(fecha, pagado);
