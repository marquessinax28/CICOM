-- Fase 6b — generación de lotes (boletos fisico/beca_residente/colchon,
-- pre-generados sin pago, para imprimir y repartir). Dos cambios: adaptar
-- la auditoría de lotes_boletos para dos archivos independientes (antes
-- solo existía un PDF; ahora también un Excel cifrado), y la función que
-- genera un lote completo dentro de una sola transacción.

-- ============================================================
-- lotes_boletos: un solo booleano (archivo_descargado) ya no alcanza --
-- ahora hay dos archivos por lote (PDF y Excel), cada uno con su propia
-- entrega única. La tabla está vacía todavía (nadie ha generado un lote),
-- así que dividir la columna no pierde datos.
-- ============================================================
alter table public.lotes_boletos drop column archivo_descargado;
alter table public.lotes_boletos
  add column pdf_descargado boolean not null default false,
  add column excel_descargado boolean not null default false;
comment on table public.lotes_boletos is 'Auditoría inmutable de cada generación de boletos sin pago. pdf_descargado y excel_descargado solo pueden pasar de false a true, cada uno por separado (ver trigger de inmutabilidad); el resto de la fila nunca cambia.';

-- fn_lotes_boletos_inmutable: misma filosofía que antes (nada se borra,
-- nada se revierte, el resto de la fila es fijo), adaptada a dos columnas
-- independientes en vez de una. Cada una se valida por su cuenta -- así
-- descargar el PDF primero y el Excel después (o al revés) son dos UPDATE
-- distintos, cada uno válido por separado, sin permitir que ninguno se
-- revierta ni que se cuele un cambio a cualquier otro campo.
create or replace function public.fn_lotes_boletos_inmutable()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'lotes_boletos es una tabla de auditoría: no se permite borrar registros'
      using errcode = 'insufficient_privilege';
  end if;

  if old.id <> new.id
     or old.tipo <> new.tipo
     or old.cantidad <> new.cantidad
     or old.generado_por <> new.generado_por
     or old.fecha_generacion <> new.fecha_generacion
  then
    raise exception 'lotes_boletos es una tabla de auditoría inmutable: id/tipo/cantidad/generado_por/fecha_generacion no se pueden modificar'
      using errcode = 'insufficient_privilege';
  end if;

  if old.pdf_descargado is distinct from new.pdf_descargado
     and (old.pdf_descargado <> false or new.pdf_descargado <> true)
  then
    raise exception 'lotes_boletos: pdf_descargado solo puede pasar de false a true'
      using errcode = 'insufficient_privilege';
  end if;

  if old.excel_descargado is distinct from new.excel_descargado
     and (old.excel_descargado <> false or new.excel_descargado <> true)
  then
    raise exception 'lotes_boletos: excel_descargado solo puede pasar de false a true'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

-- ============================================================
-- Bucket privado para los dos archivos de cada lote (PDF + Excel cifrado).
-- Mismo patrón fail-closed que plantillas-boleto/boletos-digitales:
-- public=false, sin políticas para anon/authenticated -- storage.objects
-- ya tiene RLS activo por defecto en Supabase, así que sin políticas
-- explícitas todo queda denegado salvo para service_role (que omite RLS).
-- ============================================================
insert into storage.buckets (id, name, public)
values ('lotes-boletos', 'lotes-boletos', false)
on conflict (id) do nothing;

-- ============================================================
-- fn_generar_lote_boletos: genera un lote completo (fila de lotes_boletos +
-- todos sus boletos) en una sola transacción. Folio y password_hash se
-- generan en Node (CSPRNG + bcrypt, igual que fn_crear_boleto_digital) --
-- esta función solo revalida cupo e inserta, nunca genera la credencial.
-- El INSERT de boletos es uno solo vía unnest() sobre los dos arreglos
-- paralelos, no un loop de cientos/miles de INSERT individuales.
-- ============================================================
create or replace function public.fn_generar_lote_boletos(
  p_tipo text,
  p_cantidad int,
  p_generado_por int,
  p_folios text[],
  p_password_hashes text[]
) returns int
language plpgsql
as $$
declare
  v_cupo_maximo int;
  v_existentes int;
  v_lote_id int;
begin
  if p_tipo not in ('fisico', 'beca_residente', 'colchon') then
    raise exception 'tipo_invalido' using errcode = '22023';
  end if;

  if array_length(p_folios, 1) is distinct from p_cantidad
     or array_length(p_password_hashes, 1) is distinct from p_cantidad
  then
    raise exception 'cantidad_no_coincide_con_arreglos' using errcode = '22023';
  end if;

  -- FOR UPDATE serializa llamadas concurrentes sobre el cupo de este tipo --
  -- mismo patrón que fn_crear_boleto_digital / fn_reservar_orden_digital.
  select cupo_maximo into v_cupo_maximo
    from public.cupos_boleto
    where tipo = p_tipo
    for update;

  if v_cupo_maximo is null then
    raise exception 'cupo_no_configurado' using errcode = '22023';
  end if;

  select count(*) into v_existentes from public.boletos where tipo = p_tipo;

  if v_existentes + p_cantidad > v_cupo_maximo then
    raise exception 'cupo_agotado' using errcode = '22023';
  end if;

  insert into public.lotes_boletos (tipo, cantidad, generado_por)
  values (p_tipo, p_cantidad, p_generado_por)
  returning id into v_lote_id;

  -- Nace 'disponible' (no 'vendido'): se activa después, cuando quien lo
  -- recibió capture folio + contraseña en el sitio (Fase 5-ter, todavía sin
  -- construir). orden_id se queda null -- boletos_origen_check ya exige
  -- exactamente eso para todo lo que no sea digital.
  insert into public.boletos (tipo, estado, folio, password_hash, lote_id)
  select p_tipo, 'disponible', f, h, v_lote_id
  from unnest(p_folios, p_password_hashes) as t(f, h);

  return v_lote_id;
end;
$$;

comment on function public.fn_generar_lote_boletos is 'Genera un lote completo (fisico/beca_residente/colchon) en una transacción: revalida cupo con bloqueo, inserta la fila de auditoría y todos los boletos del lote. Solo service_role la invoca, tras verificar en el servidor que quien la llama es superadmin.';

revoke all on function public.fn_generar_lote_boletos(text, int, int, text[], text[]) from public, anon, authenticated;
grant execute on function public.fn_generar_lote_boletos(text, int, int, text[], text[]) to service_role;
