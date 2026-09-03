-- RLS para las 3 tablas nuevas de Fase 4. Mismo patrón que el resto del
-- esquema (ver 20260830090200_rls_policies.sql): deny-all a anon/authenticated
-- en las tres capas (RLS + REVOKE + política explícita); todo el acceso pasa
-- por rutas de API del servidor con service_role.

-- precios_boleto — el precio se calcula en el servidor; el cliente nunca
-- lee esta tabla directo (la API expone un GET /api/comprar/precios que sí
-- filtra activo=true antes de responder).
alter table public.precios_boleto enable row level security;
revoke all on public.precios_boleto from anon, authenticated;
create policy "denegar_acceso_publico" on public.precios_boleto
  for all to anon, authenticated using (false) with check (false);

-- sesiones_compra — token_hash es una credencial (bearer token de la sesión
-- de compra); ni siquiera de solo lectura.
alter table public.sesiones_compra enable row level security;
revoke all on public.sesiones_compra from anon, authenticated;
create policy "denegar_acceso_publico" on public.sesiones_compra
  for all to anon, authenticated using (false) with check (false);

-- eventos_stripe_procesados — solo el webhook (servidor) escribe/lee.
alter table public.eventos_stripe_procesados enable row level security;
revoke all on public.eventos_stripe_procesados from anon, authenticated;
create policy "denegar_acceso_publico" on public.eventos_stripe_procesados
  for all to anon, authenticated using (false) with check (false);
