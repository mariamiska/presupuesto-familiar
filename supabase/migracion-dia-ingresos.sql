-- Día de cobro de cada ingreso.
-- NULL = último día hábil del mes (sueldos). 10 = comisiones. 15 = aguinaldo.
alter table ingresos add column if not exists dia int check (dia between 1 and 31);

comment on column ingresos.dia is
  'Día de cobro. NULL = último día hábil del mes (default de los sueldos).';

update ingresos set dia = 10 where concepto ilike 'Comisión%' and dia is distinct from 10;
update ingresos set dia = 15 where concepto ilike 'Aguinaldo%' and dia is distinct from 15;
