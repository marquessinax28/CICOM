-- RLS para las 16 tablas. Regla de arquitectura (CLAUDE.md sección 1): el
-- frontend nunca habla directo con Supabase — todo pasa por rutas de API del
-- servidor, que usan la clave service_role. service_role tiene BYPASSRLS a
-- nivel de rol de Postgres, así que estas políticas nunca lo afectan a él;
-- existen para bloquear a `anon` y `authenticated` (no hay Supabase Auth de
-- usuarios en este proyecto — los admins usan la tabla `administradores` con
-- su propia sesión, no son usuarios de `authenticated`).
--
-- Cada tabla recibe tres capas, no solo una:
--   1. ENABLE ROW LEVEL SECURITY — sin esto, una tabla sin RLS es legible por
--      cualquiera con la clave anon, sin importar qué políticas existan.
--   2. REVOKE ALL ... FROM anon, authenticated — defensa en profundidad a
--      nivel de permisos de tabla: aunque alguien deshabilite RLS por error,
--      estos roles siguen sin poder tocar la tabla.
--   3. Una política explícita "denegar_acceso_publico" FOR ALL USING (false)
--      — documenta la intención en el propio esquema en vez de dejarlo
--      implícito en la ausencia de políticas.
--
-- Ninguna tabla tiene una política que permita SELECT/INSERT/UPDATE/DELETE a
-- anon o authenticated: absolutamente todo el acceso público pasa por una
-- ruta de API que valida, autoriza y usa service_role.

-- administradores — nadie desde el cliente; el login de admin lo valida el servidor.
alter table public.administradores enable row level security;
revoke all on public.administradores from anon, authenticated;
create policy "denegar_acceso_publico" on public.administradores
  for all to anon, authenticated using (false) with check (false);

-- ordenes_compra — datos de pago; solo el servidor los crea/lee tras el webhook.
alter table public.ordenes_compra enable row level security;
revoke all on public.ordenes_compra from anon, authenticated;
create policy "denegar_acceso_publico" on public.ordenes_compra
  for all to anon, authenticated using (false) with check (false);

-- lotes_boletos — auditoría inmutable (ver también el trigger de integridad).
alter table public.lotes_boletos enable row level security;
revoke all on public.lotes_boletos from anon, authenticated;
create policy "denegar_acceso_publico" on public.lotes_boletos
  for all to anon, authenticated using (false) with check (false);

-- cupos_boleto — solo superadmin, y solo a través del servidor.
alter table public.cupos_boleto enable row level security;
revoke all on public.cupos_boleto from anon, authenticated;
create policy "denegar_acceso_publico" on public.cupos_boleto
  for all to anon, authenticated using (false) with check (false);

-- boletos — folio + password_hash son credenciales; ni siquiera de solo lectura.
alter table public.boletos enable row level security;
revoke all on public.boletos from anon, authenticated;
create policy "denegar_acceso_publico" on public.boletos
  for all to anon, authenticated using (false) with check (false);

-- codigos_verificacion — códigos hasheados; su verificación la hace el servidor.
alter table public.codigos_verificacion enable row level security;
revoke all on public.codigos_verificacion from anon, authenticated;
create policy "denegar_acceso_publico" on public.codigos_verificacion
  for all to anon, authenticated using (false) with check (false);

-- modulos — contenido público, pero igual se sirve vía API de servidor, nunca
-- vía cliente de Supabase en el navegador (regla de arquitectura, no de dato).
alter table public.modulos enable row level security;
revoke all on public.modulos from anon, authenticated;
create policy "denegar_acceso_publico" on public.modulos
  for all to anon, authenticated using (false) with check (false);

-- inscripciones_modulo — vincula boletos con módulos; boletos ya es sensible.
alter table public.inscripciones_modulo enable row level security;
revoke all on public.inscripciones_modulo from anon, authenticated;
create policy "denegar_acceso_publico" on public.inscripciones_modulo
  for all to anon, authenticated using (false) with check (false);

-- concursos — contenido público servido por el servidor, mismo criterio que modulos.
alter table public.concursos enable row level security;
revoke all on public.concursos from anon, authenticated;
create policy "denegar_acceso_publico" on public.concursos
  for all to anon, authenticated using (false) with check (false);

-- inscripciones_concurso — datos personales del capitán del equipo (nombre, correo).
alter table public.inscripciones_concurso enable row level security;
revoke all on public.inscripciones_concurso from anon, authenticated;
create policy "denegar_acceso_publico" on public.inscripciones_concurso
  for all to anon, authenticated using (false) with check (false);

-- cursos_talleres — contenido público servido por el servidor.
alter table public.cursos_talleres enable row level security;
revoke all on public.cursos_talleres from anon, authenticated;
create policy "denegar_acceso_publico" on public.cursos_talleres
  for all to anon, authenticated using (false) with check (false);

-- sedes — contenido público servido por el servidor.
alter table public.sedes enable row level security;
revoke all on public.sedes from anon, authenticated;
create policy "denegar_acceso_publico" on public.sedes
  for all to anon, authenticated using (false) with check (false);

-- comite_organizador — contenido público servido por el servidor.
alter table public.comite_organizador enable row level security;
revoke all on public.comite_organizador from anon, authenticated;
create policy "denegar_acceso_publico" on public.comite_organizador
  for all to anon, authenticated using (false) with check (false);

-- certificados — acceso solo tras validar correo + contraseña de boleto en el servidor.
alter table public.certificados enable row level security;
revoke all on public.certificados from anon, authenticated;
create policy "denegar_acceso_publico" on public.certificados
  for all to anon, authenticated using (false) with check (false);

-- patrocinadores — contenido público servido por el servidor.
alter table public.patrocinadores enable row level security;
revoke all on public.patrocinadores from anon, authenticated;
create policy "denegar_acceso_publico" on public.patrocinadores
  for all to anon, authenticated using (false) with check (false);

-- mensajes_contacto — datos personales (nombre, correo, mensaje) del formulario de contacto.
alter table public.mensajes_contacto enable row level security;
revoke all on public.mensajes_contacto from anon, authenticated;
create policy "denegar_acceso_publico" on public.mensajes_contacto
  for all to anon, authenticated using (false) with check (false);
