-- El comité confirmó precio escalonado por mes (pedido directo, no en
-- BRIEF.md): septiembre $550 MXN, octubre $650 MXN, noviembre $700 MXN.
-- precios_boleto pasa de "un precio vigente por categoría" a "uno o más
-- precios por categoría, cada uno con su propia vigencia" -- sigue siendo
-- parametrizable en base de datos, nunca fijo en código.

-- btree_gist: necesaria para el EXCLUDE de más abajo (comparar rangos de
-- fecha junto con columnas de igualdad en la misma restricción).
create extension if not exists btree_gist;

alter table public.precios_boleto
  add column vigente_desde date,
  add column vigente_hasta date; -- null = sin fecha de fin (vigente indefinidamente desde vigente_desde)

-- Se borra el placeholder ANTES de agregar las restricciones de abajo: es
-- la única fila existente y quedaría con vigente_desde/vigente_hasta nulos,
-- lo que un EXCLUDE con daterange() no maneja de forma útil (un argumento
-- nulo produce un rango nulo). Más simple partir de la tabla vacía.
delete from public.precios_boleto where categoria = 'general';

alter table public.precios_boleto
  add constraint precios_boleto_vigencia_valida
  check (vigente_hasta is null or vigente_hasta >= vigente_desde);

-- La UNIQUE(tipo_boleto, categoria) original ya no aplica -- ahora puede
-- haber varias filas por categoría, una por vigencia. Se busca el nombre
-- real en vez de asumirlo, porque Postgres lo genera automáticamente.
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
    from pg_constraint
    where conrelid = 'public.precios_boleto'::regclass
      and contype = 'u';

  if v_constraint_name is not null then
    execute format('alter table public.precios_boleto drop constraint %I', v_constraint_name);
  end if;
end $$;

-- Ninguna fila activa puede solaparse en fechas con otra de la misma
-- categoría/tipo -- se valida en el servidor de base de datos (mismo
-- criterio que el trigger de suma de cupos_boleto), no solo confiando en
-- que quien edite la tabla a mano tenga cuidado. 'infinity' representa
-- "sin fecha de fin" para que el rango sea comparable con && aunque
-- vigente_hasta sea null.
alter table public.precios_boleto
  add constraint precios_boleto_sin_solape
  exclude using gist (
    tipo_boleto with =,
    categoria with =,
    daterange(vigente_desde, coalesce(vigente_hasta, 'infinity'::date), '[]') with &&
  ) where (activo);

-- Los tres tramos de precio confirmados por el comité. Sin vigente_hasta en
-- noviembre: vigente indefinidamente hasta que se agregue un tramo nuevo o
-- se desactive esta fila.
insert into public.precios_boleto (categoria, precio_centavos, vigente_desde, vigente_hasta, activo) values
  ('general', 55000, '2026-09-01', '2026-09-30', true), -- $550.00 MXN
  ('general', 65000, '2026-10-01', '2026-10-31', true), -- $650.00 MXN
  ('general', 70000, '2026-11-01', null,          true); -- $700.00 MXN

alter table public.precios_boleto
  alter column vigente_desde set not null;

comment on column public.precios_boleto.vigente_desde is 'Primer día (inclusive) en que este precio aplica.';
comment on column public.precios_boleto.vigente_hasta is 'Último día (inclusive) en que este precio aplica; null = sin fecha de fin.';
