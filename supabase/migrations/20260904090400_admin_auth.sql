-- Fase 6a — autenticación de administradores. Dos cuentas fijas
-- (superadmin + admin), sin correos, sin registro público, contraseñas
-- permanentes generadas por scripts/crear-cuenta-admin.ts (entrega en
-- persona, sin flujo de recuperación en la aplicación).

-- ============================================================
-- correo -> usuario: esta tabla nunca tuvo un flujo real de correo (sin
-- notificaciones, sin recuperación por correo para estas cuentas) -- el
-- nombre "correo" describía algo que no existe. Nada en el código de la
-- app referenciaba esta columna todavía (tabla sin usar hasta esta fase),
-- así que renombrarla no rompe nada.
-- ============================================================
alter table public.administradores rename column correo to usuario;

alter table public.administradores drop constraint if exists administradores_correo_check;
alter table public.administradores
  add constraint administradores_usuario_check check (usuario ~ '^[a-z0-9_.-]{3,50}$');
comment on column public.administradores.usuario is 'Nombre de usuario, siempre en minúsculas -- la aplicación normaliza (trim + lowercase) antes de cualquier INSERT/SELECT (src/lib/admin/sesion-nucleo.ts). El UNIQUE de Postgres es case-sensitive; sin esa normalización, "Admin" y "admin" podrían coexistir como cuentas distintas.';

-- ============================================================
-- Bloqueo progresivo (CLAUDE.md sección 6): intentos_fallidos se incrementa
-- en cada login fallido y se resetea a 0 en uno exitoso. bloqueado_hasta lo
-- calcula la aplicación con tiers crecientes (nunca lo manda el cliente).
-- ============================================================
alter table public.administradores
  add column intentos_fallidos int not null default 0 check (intentos_fallidos >= 0),
  add column bloqueado_hasta timestamptz;

-- ============================================================
-- sesiones_admin: sesión CON ESTADO, no un JWT autocontenido -- revocable
-- al instante con un DELETE. Esto es deliberado: scripts/rotar-password-admin.ts
-- borra las filas de esa cuenta al rotar, así que una contraseña filtrada
-- deja de servir para seguir usando una sesión ya abierta, no solo para
-- abrir una nueva. token_hash es SHA-256 (no bcrypt) del token opaco de 32
-- bytes que recibe el navegador -- mismo criterio que sesiones_compra: es
-- un secreto de alta entropía, no una contraseña de baja entropía que
-- necesite el costo de bcrypt.
-- ============================================================
create table public.sesiones_admin (
  id serial primary key,
  administrador_id int not null references public.administradores (id),
  token_hash text not null unique,
  creada_en timestamptz not null default now(),
  expira_en timestamptz not null,
  ultima_actividad timestamptz not null default now()
);
comment on table public.sesiones_admin is 'Sesión de admin con estado. expira_en es el tope absoluto (24h); ultima_actividad se renueva en cada verificación y expira a los 30 min de inactividad (ambos límites los aplica la aplicación, no un trigger). Rotar la contraseña de una cuenta borra todas sus filas aquí.';

create index idx_sesiones_admin_administrador_id on public.sesiones_admin (administrador_id);
create index idx_sesiones_admin_expira_en on public.sesiones_admin (expira_en);

alter table public.sesiones_admin enable row level security;
revoke all on public.sesiones_admin from anon, authenticated;
create policy "denegar_acceso_publico" on public.sesiones_admin
  for all to anon, authenticated using (false) with check (false);
