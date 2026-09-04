-- Ajustes pedidos sobre la Fase 4 de pagos ya construida (precio por
-- tramos de fecha con columnas `date` + hoyISO(), un boleto por compra):
--
-- 1) ordenes_compra.monto_total era `numeric` (pesos con decimales) --
--    pasa a `monto_centavos` entero, igual que precios_boleto.precio_centavos
--    y ordenes_compra.precio_unitario_centavos. Elimina el redondeo de
--    punto flotante al reconciliar contra Stripe (que ya cobra en centavos).
-- 2) Se agrega precios_boleto_id: referencia a la fila exacta de
--    precios_boleto vigente al momento de la compra, para auditoría --
--    aunque el tramo cambie después, la orden queda ligada a cuál aplicó.

alter table public.ordenes_compra rename column monto_total to monto_centavos;

-- Los valores existentes son pesos con dos decimales (ej. 550.00). El
-- USING se evalúa sobre el valor ya renombrado, antes de aplicar el nuevo
-- tipo, así que sigue leyendo los pesos correctos.
alter table public.ordenes_compra
  alter column monto_centavos type integer using round(monto_centavos * 100)::integer,
  alter column monto_centavos set default 0;

alter table public.ordenes_compra
  add column precios_boleto_id integer references public.precios_boleto (id);

comment on column public.ordenes_compra.monto_centavos is 'Monto total cobrado, en centavos -- entero, sin redondeo de punto flotante. Con un boleto por orden, coincide con precio_unitario_centavos.';
comment on column public.ordenes_compra.precios_boleto_id is 'Fila de precios_boleto vigente al momento de la compra -- auditoría de qué tramo aplicó, aunque el tramo cambie después.';

-- fn_reservar_orden_digital gana el parámetro p_precios_boleto_id.
-- Postgres no permite cambiar la lista de parámetros con CREATE OR
-- REPLACE -- se elimina la firma vieja explícitamente para no dejarla
-- huérfana con privilegios PUBLIC por default.
drop function if exists public.fn_reservar_orden_digital(text, text, text, int);

create or replace function public.fn_reservar_orden_digital(
  p_nombre text,
  p_correo text,
  p_categoria text,
  p_precio_unitario_centavos int,
  p_precios_boleto_id int
) returns int
language plpgsql
as $$
declare
  v_cupo_maximo int;
  v_reservado int;
  v_id int;
begin
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

  -- Un boleto por orden: contar filas es exactamente contar boletos.
  select count(*) into v_reservado
    from public.ordenes_compra
    where estado = 'pagado'
       or (estado = 'pendiente' and fecha_compra > now() - interval '30 minutes');

  if v_reservado + 1 > v_cupo_maximo then
    raise exception 'cupo_agotado' using errcode = '22023';
  end if;

  insert into public.ordenes_compra (
    nombre_comprador, correo_comprador, monto_centavos,
    estado, categoria, precio_unitario_centavos, precios_boleto_id, stripe_payment_intent_id
  ) values (
    p_nombre, p_correo, p_precio_unitario_centavos,
    'pendiente', p_categoria, p_precio_unitario_centavos, p_precios_boleto_id, null
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.fn_reservar_orden_digital is 'Reserva cupo digital y crea la orden pendiente (siempre un boleto) en una sola operación atómica. Solo service_role la invoca, tras resolver el precio vigente en el servidor.';

revoke all on function public.fn_reservar_orden_digital(text, text, text, int, int) from public, anon, authenticated;
grant execute on function public.fn_reservar_orden_digital(text, text, text, int, int) to service_role;

-- fn_marcar_orden_pagada: misma firma, solo se simplifica la reconciliación
-- ahora que monto_centavos ya es entero -- ya no hace falta
-- round(monto_total * 100)::int, que era exactamente el tipo de redondeo
-- de punto flotante que se quería evitar.
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
    raise exception 'monto_no_coincide: esperado % recibido %',
      v_orden.monto_centavos, p_amount_received_centavos
      using errcode = '22023';
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

comment on function public.fn_marcar_orden_pagada is 'Reconcilia amount_received contra monto_centavos (entero, sin redondeo) y marca la orden pagada. Ver comentario interno: punto de extensión para la generación de boletos en Fase 5.';
