-- El comité subió el aforo de 6,000 a 8,000 boletos (los 2,000 adicionales,
-- todos digitales). fn_check_cupos_boleto_total tenía el tope de 6,000
-- escrito directamente en el cuerpo de la función -- cambiarlo exigía una
-- migración cada vez que el comité ajustara el aforo. Se mueve ese número a
-- una tabla de configuración de una sola fila: de ahora en adelante, un
-- cambio de aforo es un UPDATE de una fila (vía SQL Editor mientras no exista
-- panel de superadmin), nunca una migración ni un cambio de código.

-- ============================================================
-- aforo_total_boletos: singleton (un solo renglón posible, id fijo en 1 por
-- el CHECK + primary key). Mismas columnas de auditoría que cupos_boleto
-- (modificado_por, fecha_modificacion) y mismo tratamiento de RLS -- solo
-- service_role, nunca anon/authenticated, ni siquiera de lectura.
-- ============================================================
create table public.aforo_total_boletos (
  id int primary key default 1 check (id = 1),
  cupo_total_maximo int not null check (cupo_total_maximo >= 0),
  modificado_por int references public.administradores (id),
  fecha_modificacion timestamptz not null default now()
);
comment on table public.aforo_total_boletos is 'Tope total de boletos del congreso (suma máxima permitida de cupos_boleto.cupo_maximo entre los cuatro tipos), en una sola fila configurable. Cambiar el aforo es un UPDATE de esta fila -- fn_check_cupos_boleto_total lo lee de aquí, nunca tiene el número escrito en el cuerpo de la función.';

alter table public.aforo_total_boletos enable row level security;
revoke all on public.aforo_total_boletos from anon, authenticated;
create policy "denegar_acceso_publico" on public.aforo_total_boletos
  for all to anon, authenticated using (false) with check (false);

insert into public.aforo_total_boletos (id, cupo_total_maximo) values (1, 8000);

-- ============================================================
-- fn_check_cupos_boleto_total: mismo comportamiento de validación, pero el
-- tope ahora se lee de aforo_total_boletos en vez de estar escrito aquí.
-- ============================================================
create or replace function public.fn_check_cupos_boleto_total()
returns trigger
language plpgsql
as $$
declare
  total int;
  tope int;
begin
  select cupo_total_maximo into tope from public.aforo_total_boletos where id = 1;
  if tope is null then
    raise exception 'aforo_total_no_configurado' using errcode = '22023';
  end if;

  select coalesce(sum(cupo_maximo), 0)
    into total
    from public.cupos_boleto
    where id <> new.id;

  total := total + new.cupo_maximo;

  if total > tope then
    raise exception
      'La suma de cupo_maximo de todos los tipos no puede exceder % (resultaría en %)', tope, total
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.fn_check_cupos_boleto_total is 'Valida que la suma de cupo_maximo de los cuatro tipos no exceda el tope vigente en aforo_total_boletos. El tope en sí vive en esa tabla, no en esta función -- cambiarlo no requiere una migración.';

-- La tabla ya dice lo mismo que antes salvo el número hardcodeado, que
-- dejó de ser cierto (6000 -> configurable, hoy 8000).
comment on table public.cupos_boleto is 'Tope configurable por tipo de boleto. La suma de cupo_maximo de los cuatro tipos no puede exceder el tope vigente en aforo_total_boletos (aplicado por trigger, no solo por CHECK, porque es una regla entre filas).';

-- ============================================================
-- Aplica el nuevo aforo: los 2,000 boletos adicionales son todos digitales
-- (1,500 -> 3,500). fisico/beca_residente/colchon no cambian. Esta UPDATE
-- corre DESPUÉS de que el trigger ya lee el tope de 8000 de la tabla de
-- arriba -- si corriera antes, el trigger la habría rechazado (2500+1500+
-- 500+3500=8000 > 6000, el tope viejo).
-- ============================================================
update public.cupos_boleto set cupo_maximo = 3500 where tipo = 'digital';
