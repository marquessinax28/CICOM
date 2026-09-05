-- Auditoría de cada reemisión de URL firmada para un archivo de lote ya
-- descargado (scripts/reemitir-archivo-lote.ts). No es la misma tabla que
-- reenvios_boleto -- esa es específica de boletos digitales individuales
-- (boleto_id, rotación de contraseña); aquí el sujeto es un lote completo
-- y un archivo (pdf|xlsx), sin contraseña que rotar. Mismo patrón fail-closed
-- que el resto del esquema: solo service_role, ni siquiera lectura para
-- anon/authenticated.
create table public.reemisiones_lote (
  id serial primary key,
  lote_id int not null references public.lotes_boletos (id),
  archivo text not null check (archivo in ('pdf', 'xlsx')),
  motivo text not null check (char_length(motivo) between 1 and 500),
  resultado text not null check (resultado in ('ok', 'error')),
  detalle text,
  fecha timestamptz not null default now()
);
comment on table public.reemisiones_lote is 'Auditoría de cada reemisión de URL firmada para un archivo de lote ya marcado como descargado. No recupera ninguna contraseña -- si la del Excel se perdió, el archivo cifrado sigue siendo inservible; esto solo permite volver a bajar los mismos bytes ya generados.';

create index idx_reemisiones_lote_lote_id on public.reemisiones_lote (lote_id);

alter table public.reemisiones_lote enable row level security;
revoke all on public.reemisiones_lote from anon, authenticated;
create policy "denegar_acceso_publico" on public.reemisiones_lote
  for all to anon, authenticated using (false) with check (false);
