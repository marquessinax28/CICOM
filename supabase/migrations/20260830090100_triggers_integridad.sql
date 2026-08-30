-- Reglas de integridad que no se pueden expresar como CHECK de una sola fila
-- porque dependen de otras filas (cupos_boleto) o deben bloquear operaciones
-- completas sin excepción, sin importar el rol que las ejecute (lotes_boletos).

-- ============================================================
-- cupos_boleto: la suma de cupo_maximo de los 4 tipos no puede exceder 6000.
-- Se valida en el servidor de base de datos (no en el cliente, no solo en la
-- app) para que ninguna vía de escritura pueda saltarse la regla.
-- ============================================================
create or replace function public.fn_check_cupos_boleto_total()
returns trigger
language plpgsql
as $$
declare
  total int;
begin
  select coalesce(sum(cupo_maximo), 0)
    into total
    from public.cupos_boleto
    where id <> new.id;

  total := total + new.cupo_maximo;

  if total > 6000 then
    raise exception
      'La suma de cupo_maximo de todos los tipos no puede exceder 6000 (resultaría en %)', total
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger trg_cupos_boleto_total
  before insert or update of cupo_maximo on public.cupos_boleto
  for each row
  execute function public.fn_check_cupos_boleto_total();

-- ============================================================
-- lotes_boletos: auditoría inmutable. Nadie puede borrar filas. La única
-- actualización permitida es marcar archivo_descargado de false a true —
-- cualquier otro cambio (incluyendo revertir esa bandera, o tocar tipo,
-- cantidad, generado_por o fecha_generacion) se rechaza. Esto aplica incluso
-- a service_role, porque un trigger corre sin importar quién ejecuta la
-- sentencia (a diferencia de RLS, que service_role omite por completo).
-- ============================================================
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
     or old.archivo_descargado = true
     or new.archivo_descargado = false
  then
    raise exception
      'lotes_boletos es una tabla de auditoría inmutable: solo se permite marcar archivo_descargado de false a true'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger trg_lotes_boletos_bloquear_delete
  before delete on public.lotes_boletos
  for each row
  execute function public.fn_lotes_boletos_inmutable();

create trigger trg_lotes_boletos_bloquear_update
  before update on public.lotes_boletos
  for each row
  execute function public.fn_lotes_boletos_inmutable();
