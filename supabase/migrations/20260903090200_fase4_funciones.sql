-- Funciones de servidor para el flujo de compra digital. Ambas corren en
-- una sola sentencia (una llamada a función = una transacción implícita),
-- así que el SELECT ... FOR UPDATE dentro de cada una sí sirve para
-- serializar llamadas concurrentes -- no se abre una transacción manual
-- porque el candado nunca debe sobrevivir a una llamada de red externa
-- (la API de Stripe se llama DESPUÉS de que esta función ya terminó).
--
-- CRÍTICO: PostgREST expone cualquier función de `public` como
-- /rest/v1/rpc/<nombre> si el rol que llama tiene privilegio EXECUTE, y
-- Postgres otorga EXECUTE a PUBLIC por default al crear una función. Sin el
-- REVOKE explícito de abajo, cualquiera con la clave anon podría invocar
-- fn_reservar_orden_digital directo vía REST pasando el precio que quisiera
-- -- exactamente el bypass que la regla "el precio se calcula en el
-- servidor" prohíbe. Estas funciones son invocables SOLO por service_role,
-- y solo desde las rutas de API de este proyecto.

-- ============================================================
-- fn_reservar_orden_digital: valida cupo disponible del tipo 'digital' y
-- crea la orden en estado 'pendiente' dentro de la misma operación. El cupo
-- "reservado" cuenta boletos digitales ya pagados MÁS órdenes pendientes
-- recientes (< 30 min) -- una orden pendiente más vieja que eso se asume
-- abandonada y deja de contar, sin depender de un webhook de expiración
-- (Stripe no expira PaymentIntents por sí solo, a diferencia de Checkout
-- Sessions).
-- ============================================================
create or replace function public.fn_reservar_orden_digital(
  p_nombre text,
  p_correo text,
  p_cantidad int,
  p_categoria text,
  p_precio_unitario_centavos int
) returns int
language plpgsql
as $$
declare
  v_cupo_maximo int;
  v_reservado int;
  v_id int;
begin
  if p_cantidad is null or p_cantidad <= 0 or p_cantidad > 10 then
    raise exception 'cantidad_invalida' using errcode = '22023';
  end if;

  -- FOR UPDATE bloquea esta fila hasta que la función termine: dos llamadas
  -- concurrentes se serializan aquí, así ninguna puede leer el mismo cupo
  -- "disponible" y ambas reservar el último boleto.
  select cupo_maximo into v_cupo_maximo
    from public.cupos_boleto
    where tipo = 'digital'
    for update;

  if v_cupo_maximo is null then
    raise exception 'cupo_no_configurado' using errcode = '22023';
  end if;

  select coalesce(sum(cantidad_boletos), 0) into v_reservado
    from public.ordenes_compra
    where estado = 'pagado'
       or (estado = 'pendiente' and fecha_compra > now() - interval '30 minutes');

  if v_reservado + p_cantidad > v_cupo_maximo then
    raise exception 'cupo_agotado' using errcode = '22023';
  end if;

  insert into public.ordenes_compra (
    nombre_comprador, correo_comprador, monto_total, cantidad_boletos,
    estado, categoria, precio_unitario_centavos, stripe_payment_intent_id
  ) values (
    p_nombre, p_correo, (p_precio_unitario_centavos::numeric * p_cantidad) / 100.0, p_cantidad,
    'pendiente', p_categoria, p_precio_unitario_centavos, null
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.fn_reservar_orden_digital is 'Reserva cupo digital y crea la orden pendiente en una sola operación atómica. Solo service_role la invoca, tras calcular el precio en el servidor.';

revoke all on function public.fn_reservar_orden_digital from public, anon, authenticated;
grant execute on function public.fn_reservar_orden_digital to service_role;

-- ============================================================
-- fn_marcar_orden_pagada: reconcilia el monto recibido contra el esperado y
-- marca la orden pagada. Idempotente a nivel de fila: si ya estaba pagada,
-- regresa esa misma fila sin volver a aplicar efectos (defensa adicional a
-- la idempotencia por event.id que ya aplica el webhook antes de llamar
-- esta función).
-- ============================================================
create or replace function public.fn_marcar_orden_pagada(
  p_payment_intent_id text,
  p_amount_received_centavos int
) returns table (id int, estado text, ya_estaba_pagada boolean)
language plpgsql
as $$
declare
  v_orden public.ordenes_compra%rowtype;
  v_esperado_centavos int;
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

  v_esperado_centavos := round(v_orden.monto_total * 100)::int;

  if p_amount_received_centavos <> v_esperado_centavos then
    update public.ordenes_compra
      set estado = 'fallido'
      where ordenes_compra.id = v_orden.id;
    raise exception 'monto_no_coincide: esperado % recibido %',
      v_esperado_centavos, p_amount_received_centavos
      using errcode = '22023';
  end if;

  update public.ordenes_compra
    set estado = 'pagado'
    where ordenes_compra.id = v_orden.id;

  -- ------------------------------------------------------------
  -- PUNTO DE EXTENSIÓN — FASE 5 (generación de boletos digitales)
  -- ------------------------------------------------------------
  -- Aquí, justo después de marcar la orden 'pagado' y ANTES del `return
  -- query` de abajo, es donde Fase 5 debe generar `cantidad_boletos` filas
  -- en `boletos` (tipo='digital', orden_id=v_orden.id, folio + password_hash
  -- generados con CSPRNG, contraseña en claro solo en memoria de la
  -- aplicación el tiempo de dibujarla en el PDF/correo). NO implementar
  -- todavía -- Fase 4 solo registra la orden pagada.
  -- ------------------------------------------------------------

  return query select v_orden.id, 'pagado'::text, false;
end;
$$;

comment on function public.fn_marcar_orden_pagada is 'Reconcilia amount_received contra el monto esperado y marca la orden pagada. Ver comentario interno: punto de extensión para la generación de boletos en Fase 5.';

revoke all on function public.fn_marcar_orden_pagada from public, anon, authenticated;
grant execute on function public.fn_marcar_orden_pagada to service_role;
