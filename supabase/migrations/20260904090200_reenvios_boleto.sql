-- Auditoría de reenvíos/rotaciones de contraseña de boleto digital
-- (scripts/reenviar-boleto.ts). Herramienta operativa manual: hoy no hay
-- ninguna ruta pública que reenvíe boletos, y sin sistema de admins (Fase
-- 5b) no hay quién atribuir la acción a un usuario -- por eso no lleva FK a
-- administradores todavía; motivo (texto libre, obligatorio) es el sustituto
-- de "quién" mientras tanto. Cuando exista el login de admin, se agrega la
-- columna ejecutado_por con su FK.
create table public.reenvios_boleto (
  id serial primary key,
  boleto_id int not null references public.boletos (id),
  accion text not null check (accion in ('reenvio', 'rotacion_password')),
  motivo text not null check (char_length(motivo) between 1 and 500),
  resultado text not null check (resultado in ('ok', 'error')),
  detalle text,
  -- Solo se llena cuando accion = 'rotacion_password'. Guarda el hash VIEJO
  -- (nunca la contraseña en claro -- eso violaría la misma regla que motivó
  -- la rotación) para poder verificar después, si alguien reclama con una
  -- contraseña vieja en la mano, que en efecto era la de este boleto y no
  -- una inventada: se rehashea la contraseña reclamada con el mismo costo
  -- de bcrypt y se compara contra esta columna, igual que un login normal.
  password_hash_anterior text,
  fecha timestamptz not null default now()
);
comment on table public.reenvios_boleto is 'Auditoría de cada reenvío o rotación de contraseña ejecutado por scripts/reenviar-boleto.ts. Se inserta tanto en éxito como en error -- un intento fallido también queda registrado. No se actualiza ni se borra desde la aplicación (mismo principio de inmutabilidad que CLAUDE.md pide para la auditoría de lotes, sección 5-bis) aunque, sin sistema de admins todavía, no hay un rol separado al que quitarle el privilegio de UPDATE/DELETE -- queda como invariante de la aplicación hasta Fase 5b.';

create index idx_reenvios_boleto_boleto_id on public.reenvios_boleto (boleto_id);

-- Mismo patrón fail-closed que el resto del esquema (ver
-- 20260903090100_fase4_rls.sql): nadie fuera de service_role toca esta
-- tabla, ni siquiera de lectura -- contiene un hash de contraseña.
alter table public.reenvios_boleto enable row level security;
revoke all on public.reenvios_boleto from anon, authenticated;
create policy "denegar_acceso_publico" on public.reenvios_boleto
  for all to anon, authenticated using (false) with check (false);
