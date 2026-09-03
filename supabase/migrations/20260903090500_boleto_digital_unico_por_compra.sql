-- Decisión del comité: un boleto digital por compra. El certificado es
-- individual y se accede con el correo del boleto -- permitir varios
-- boletos bajo la misma orden/correo creaba ambigüedad sobre a quién
-- pertenece cada certificado. Quien quiera varios boletos hace varias
-- compras, cada una con su propio correo verificado.
--
-- cantidad_boletos deja de aportar información (siempre sería 1): se
-- elimina en vez de dejarlo como un vestigio forzado a una constante.

alter table public.ordenes_compra drop column cantidad_boletos;

-- fn_reservar_orden_digital pierde el parámetro p_cantidad. Postgres no
-- permite cambiar la lista de parámetros con CREATE OR REPLACE -- hay que
-- eliminar la firma vieja explícitamente, porque si no quedaría huérfana
-- con sus propios privilegios PUBLIC por default (el mismo bypass que el
-- REVOKE original de esta función existe para prevenir).
drop function if exists public.fn_reservar_orden_digital(text, text, int, text, int);

create or replace function public.fn_reservar_orden_digital(
  p_nombre text,
  p_correo text,
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
    nombre_comprador, correo_comprador, monto_total,
    estado, categoria, precio_unitario_centavos, stripe_payment_intent_id
  ) values (
    p_nombre, p_correo, p_precio_unitario_centavos::numeric / 100.0,
    'pendiente', p_categoria, p_precio_unitario_centavos, null
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.fn_reservar_orden_digital is 'Reserva cupo digital y crea la orden pendiente (siempre un boleto) en una sola operación atómica. Solo service_role la invoca, tras calcular el precio en el servidor.';

revoke all on function public.fn_reservar_orden_digital(text, text, text, int) from public, anon, authenticated;
grant execute on function public.fn_reservar_orden_digital(text, text, text, int) to service_role;
