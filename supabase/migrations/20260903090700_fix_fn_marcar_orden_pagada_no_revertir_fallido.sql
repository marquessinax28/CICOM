-- Corrige un bug real en fn_marcar_orden_pagada: en el caso de monto que no
-- coincide, la función hacía UPDATE ... SET estado = 'fallido' y LUEGO
-- `raise exception`. Una función de Postgres es una sola transacción
-- implícita -- lanzar una excepción deshace todo lo hecho en la llamada,
-- incluido ese UPDATE. Resultado real: la orden se quedaba en 'pendiente'
-- para siempre (nunca pasaba a 'fallido'), y como el event.id ya había
-- quedado registrado en eventos_stripe_procesados ANTES de llamar esta
-- función (para idempotencia), un reintento de Stripe con el mismo evento
-- nunca vuelve a intentar la reconciliación -- el desajuste queda huérfano.
--
-- Encontrado escribiendo una prueba real de "webhook con monto distinto al
-- guardado" (CAMBIO 2, punto 4) contra la base real, no por inspección.
--
-- Fix: en vez de relanzar, la función regresa el estado resultante
-- ('fallido') como fila normal -- el UPDATE que la precede sí persiste
-- porque la función termina sin excepción. orden_no_encontrada sigue
-- lanzando (ahí no hay ningún UPDATE previo que se pueda perder).

create or replace function public.fn_marcar_orden_pagada(
  p_payment_intent_id text,
  p_amount_received_centavos int
) returns table (id int, estado text, ya_estaba_pagada boolean)
language plpgsql
as $$
declare
  v_orden public.ordenes_compra%rowtype;
begin
  select * into v_orden
    from public.ordenes_compra
    where stripe_payment_intent_id = p_payment_intent_id
    for update;

  if not found then
    raise exception 'orden_no_encontrada' using errcode = 'P0002';
  end if;

  if v_orden.estado = 'pagado' then
    return query select v_orden.id, v_orden.estado, true;
    return;
  end if;

  if p_amount_received_centavos <> v_orden.monto_centavos then
    update public.ordenes_compra
      set estado = 'fallido'
      where ordenes_compra.id = v_orden.id;

    -- Se regresa el resultado, NO se relanza -- relanzar revertiría este
    -- mismo UPDATE. El llamador (el webhook) decide qué registrar según
    -- el `estado` de la fila que regresa.
    return query select v_orden.id, 'fallido'::text, false;
    return;
  end if;

  update public.ordenes_compra
    set estado = 'pagado'
    where ordenes_compra.id = v_orden.id;

  -- ------------------------------------------------------------
  -- PUNTO DE EXTENSIÓN — FASE 5 (generación de boletos digitales)
  -- ------------------------------------------------------------
  -- Aquí, justo después de marcar la orden 'pagado' y ANTES del `return
  -- query` de abajo, es donde Fase 5 debe generar la fila en `boletos`
  -- (tipo='digital', orden_id=v_orden.id, un boleto por orden, folio +
  -- password_hash generados con CSPRNG, contraseña en claro solo en
  -- memoria de la aplicación el tiempo de dibujarla en el PDF/correo).
  -- NO implementar todavía -- Fase 4 solo registra la orden pagada.
  -- ------------------------------------------------------------

  return query select v_orden.id, 'pagado'::text, false;
end;
$$;

comment on function public.fn_marcar_orden_pagada is 'Reconcilia amount_received contra monto_centavos y marca la orden pagada o fallida -- nunca lanza en el caso de desajuste de monto, para que ese UPDATE no se revierta. orden_no_encontrada sigue lanzando (sin UPDATE previo que perder). Ver comentario interno: punto de extensión para la generación de boletos en Fase 5.';
