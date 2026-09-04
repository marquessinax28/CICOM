-- Fase 5 — punto de extensión documentado en fn_marcar_orden_pagada
-- (migración 20260903090700): crea el boleto digital dentro de su propia
-- función/transacción, invocada por el webhook (Node) justo después de que
-- fn_marcar_orden_pagada confirma el pago. Folio y password_hash se
-- generan en Node (CSPRNG + bcrypt, src/lib/hash.ts) -- Postgres solo
-- inserta y revalida cupo, nunca genera la credencial.

-- "Un boleto por compra" (CLAUDE.md / BRIEF.md) es un invariante real, no
-- solo una convención de la aplicación: la columna ya tenía un índice no
-- único sobre orden_id -- se reemplaza por uno único para que la base de
-- datos misma lo garantice. Como beneficio directo, esto también hace que
-- fn_crear_boleto_digital sea segura de reintentar: una segunda llamada
-- para la misma orden falla con 23505 (unique_violation) en vez de crear
-- un segundo boleto -- mismo patrón de idempotencia que
-- eventos_stripe_procesados.
drop index if exists public.idx_boletos_orden_id;
create unique index idx_boletos_orden_id on public.boletos (orden_id) where orden_id is not null;

create or replace function public.fn_crear_boleto_digital(
  p_orden_id int,
  p_folio text,
  p_password_hash text,
  p_nombre text,
  p_correo text
) returns int
language plpgsql
as $$
declare
  v_cupo_maximo int;
  v_existentes int;
  v_id int;
begin
  -- FOR UPDATE serializa llamadas concurrentes sobre el cupo digital --
  -- mismo patrón que fn_reservar_orden_digital. La reserva de cupo ya
  -- ocurrió ahí, al crear la orden; este segundo chequeo, sobre `boletos`
  -- (el registro real de credenciales emitidas, no de órdenes), es la
  -- validación que CLAUDE.md pide "dentro de la misma transacción que
  -- inserta los boletos" -- barata y consistente con cómo se validará el
  -- cupo al generar lotes en Fase 5b.
  select cupo_maximo into v_cupo_maximo
    from public.cupos_boleto
    where tipo = 'digital'
    for update;

  if v_cupo_maximo is null then
    raise exception 'cupo_no_configurado' using errcode = '22023';
  end if;

  select count(*) into v_existentes
    from public.boletos
    where tipo = 'digital';

  if v_existentes + 1 > v_cupo_maximo then
    raise exception 'cupo_agotado' using errcode = '22023';
  end if;

  -- Un boleto digital nace directamente 'vendido' -- la compra misma es la
  -- activación, a diferencia de un boleto de lote (que nace 'disponible' y
  -- se activa después con folio + contraseña). fecha_activacion = now()
  -- por el mismo motivo.
  insert into public.boletos (
    orden_id, tipo, estado, folio, password_hash, nombre_completo, correo, fecha_activacion
  ) values (
    p_orden_id, 'digital', 'vendido', p_folio, p_password_hash, p_nombre, p_correo, now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.fn_crear_boleto_digital is 'Inserta el boleto digital de una orden ya pagada, revalidando el cupo digital dentro de la misma transacción. orden_id es único en boletos -- una segunda llamada para la misma orden falla con 23505, no duplica el boleto.';

revoke all on function public.fn_crear_boleto_digital from public, anon, authenticated;
grant execute on function public.fn_crear_boleto_digital to service_role;
