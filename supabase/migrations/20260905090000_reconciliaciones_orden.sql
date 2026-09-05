-- Auditoría de cada reparación manual hecha por scripts/reconciliar-ordenes.ts:
-- una orden que Stripe cobró pero que se quedó en 'pendiente' en la base
-- (ej. por el 401 transitorio de Supabase que motivó esta ronda de
-- cambios), reparada a mano marcándola pagada y generando su boleto por el
-- mismo camino que usa el webhook. Mismo patrón fail-closed que el resto
-- del esquema: solo service_role, ni siquiera lectura para
-- anon/authenticated.
create table public.reconciliaciones_orden (
  id serial primary key,
  orden_id int not null references public.ordenes_compra (id),
  estado_stripe text not null,
  motivo text not null check (char_length(motivo) between 1 and 500),
  resultado text not null check (resultado in ('ok', 'error')),
  detalle text,
  fecha timestamptz not null default now()
);
comment on table public.reconciliaciones_orden is 'Auditoría de cada reparación manual hecha por scripts/reconciliar-ordenes.ts sobre una orden pagada en Stripe pero pendiente en la base. estado_stripe es el status real reportado por Stripe al momento de la reparación (ej. "succeeded").';

create index idx_reconciliaciones_orden_orden_id on public.reconciliaciones_orden (orden_id);

alter table public.reconciliaciones_orden enable row level security;
revoke all on public.reconciliaciones_orden from anon, authenticated;
create policy "denegar_acceso_publico" on public.reconciliaciones_orden
  for all to anon, authenticated using (false) with check (false);
