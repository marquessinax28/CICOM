-- Tabla nueva descubierta al construir el frontend (Fase 3): el home necesita
-- hero (edición/fechas/estado/lema), profesor(a) homenajeado(a) y mensaje de
-- bienvenida, y /historico necesita un listado de ediciones pasadas. Ninguna
-- de las 16 tablas de Fase 2 cubre esto — se agrega una tabla, no dos, porque
-- las tres cosas son contenido "de una sola edición" y /historico es
-- literalmente una lista de estas mismas filas en el tiempo.
create table public.ediciones (
  id serial primary key,
  numero int check (numero > 0),
  nombre text check (char_length(nombre) <= 200),
  lema text check (char_length(lema) <= 300),
  fecha_inicio date,
  fecha_fin date,
  estado text check (estado in ('proximo', 'en_curso', 'finalizado')),
  -- A lo más una edición puede ser "la actual" mostrada en el home.
  es_actual boolean not null default false,
  homenajeado_nombre text check (char_length(homenajeado_nombre) <= 200),
  homenajeado_bio text,
  homenajeado_foto_home_url text,
  homenajeado_foto_subpagina_url text,
  bienvenida_autor_nombre text check (char_length(bienvenida_autor_nombre) <= 200),
  bienvenida_autor_foto_url text,
  bienvenida_mensaje text,
  fecha_creacion timestamptz not null default now()
);
comment on table public.ediciones is 'Una fila por edición del CICOM. La marcada es_actual=true alimenta el hero, homenajeado y mensaje de bienvenida del home; el resto alimenta /historico.';

-- Solo puede haber una edición "actual" a la vez.
create unique index idx_ediciones_una_actual on public.ediciones (es_actual) where es_actual = true;

create index idx_ediciones_numero on public.ediciones (numero);

alter table public.ediciones enable row level security;
revoke all on public.ediciones from anon, authenticated;
create policy "denegar_acceso_publico" on public.ediciones
  for all to anon, authenticated using (false) with check (false);
