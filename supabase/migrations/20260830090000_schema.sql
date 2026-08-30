-- Fase 2 — Esquema de base de datos (16 tablas, ver Mapa_Sitio_y_Requerimientos_CICOM.md).
-- Orden de creación respeta las dependencias de llaves foráneas.

-- ============================================================
-- administradores
-- ============================================================
create table public.administradores (
  id serial primary key,
  correo text not null unique check (char_length(correo) <= 254),
  password_hash text not null,
  nombre text not null check (char_length(nombre) between 1 and 200),
  rol text not null check (rol in ('admin', 'superadmin'))
);
comment on table public.administradores is 'Cuentas del panel de administración, separadas por completo de los datos de asistentes.';

-- ============================================================
-- ordenes_compra
-- ============================================================
create table public.ordenes_compra (
  id serial primary key,
  nombre_comprador text not null check (char_length(nombre_comprador) between 1 and 200),
  correo_comprador text not null check (char_length(correo_comprador) <= 254),
  monto_total numeric(12, 2) not null check (monto_total >= 0),
  stripe_payment_intent_id text not null unique,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'fallido', 'reembolsado')),
  cantidad_boletos int not null check (cantidad_boletos > 0),
  fecha_compra timestamptz not null default now()
);
comment on table public.ordenes_compra is 'El pago, una sola vez por compra digital. stripe_payment_intent_id es la fuente de verdad del monto.';

-- ============================================================
-- lotes_boletos (tabla de auditoría — inmutable, ver migración 20260830090200)
-- ============================================================
create table public.lotes_boletos (
  id serial primary key,
  tipo text not null check (tipo in ('fisico', 'beca_residente', 'colchon')),
  cantidad int not null check (cantidad > 0),
  generado_por int not null references public.administradores (id),
  fecha_generacion timestamptz not null default now(),
  archivo_descargado boolean not null default false
);
comment on table public.lotes_boletos is 'Auditoría inmutable de cada generación de boletos sin pago. Solo archivo_descargado puede pasar de false a true (ver trigger de inmutabilidad).';

-- ============================================================
-- cupos_boleto (la suma de cupo_maximo se valida en el trigger de abajo)
-- ============================================================
create table public.cupos_boleto (
  id serial primary key,
  tipo text not null unique check (tipo in ('fisico', 'beca_residente', 'colchon', 'digital')),
  cupo_maximo int not null check (cupo_maximo >= 0),
  modificado_por int references public.administradores (id),
  fecha_modificacion timestamptz not null default now()
);
comment on table public.cupos_boleto is 'Tope configurable por tipo de boleto. La suma de cupo_maximo de los cuatro tipos no puede exceder 6000 (aplicado por trigger, no solo por CHECK, porque es una regla entre filas).';

-- ============================================================
-- boletos
-- ============================================================
create table public.boletos (
  id serial primary key,
  orden_id int references public.ordenes_compra (id),
  lote_id int references public.lotes_boletos (id),
  tipo text not null check (tipo in ('fisico', 'beca_residente', 'colchon', 'digital')),
  estado text not null default 'disponible' check (estado in ('disponible', 'vendido')),
  -- Folio de 12 caracteres, mismo alfabeto sin ambigüedades que la contraseña
  -- (sin 0/O, 1/l/I). El CHECK garantiza el formato; la aleatoriedad real la
  -- produce el CSPRNG del lado de la aplicación, no la base de datos.
  --
  -- Nota de diseño (CLAUDE.md sección 2, desviación documentada de la regla de
  -- la sección 1 de ≥128 bits para identificadores públicos): 12 caracteres de
  -- un alfabeto de 32 símbolos dan 60 bits (32^12 = 2^60), no 128. Se acepta
  -- porque el folio no es un secreto autosuficiente -- toda operación exige
  -- además la contraseña correcta -- y el bloqueo progresivo de la sección 6
  -- vuelve inviable la fuerza bruta en línea sobre folio+contraseña juntos.
  -- Si el rate limiting no está implementado, este folio debe tratarse como
  -- inseguro.
  folio text not null unique check (folio ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$'),
  password_hash text not null,
  nombre_completo text check (char_length(nombre_completo) <= 120),
  correo text check (char_length(correo) <= 254),
  intentos_fallidos int not null default 0 check (intentos_fallidos >= 0),
  certificado_descargado boolean not null default false,
  fecha_generado timestamptz not null default now(),
  fecha_activacion timestamptz,
  -- Un boleto digital nace de una orden pagada; uno pre-generado nace de un lote.
  -- Nunca ambos, nunca ninguno.
  constraint boletos_origen_check check (
    (tipo = 'digital' and orden_id is not null and lote_id is null)
    or (tipo <> 'digital' and lote_id is not null and orden_id is null)
  )
);
comment on table public.boletos is 'Cada asistente individual. folio + password_hash son la credencial; no hay cuentas de usuario.';

-- ============================================================
-- codigos_verificacion
-- ============================================================
create table public.codigos_verificacion (
  id serial primary key,
  correo text not null check (char_length(correo) <= 254),
  codigo_hash text not null,
  intentos_fallidos int not null default 0 check (intentos_fallidos >= 0),
  expira_en timestamptz not null,
  verificado boolean not null default false,
  fecha_creacion timestamptz not null default now()
);
comment on table public.codigos_verificacion is 'Código de 6 dígitos para confirmar el correo antes de desbloquear el checkout. Un solo uso, expira en ~10 minutos.';

-- ============================================================
-- modulos
-- ============================================================
create table public.modulos (
  id serial primary key,
  nombre text not null check (char_length(nombre) <= 200),
  descripcion text,
  especialidad text,
  archivo_pdf_url text,
  orden int not null default 0
);
comment on table public.modulos is 'Los 39 módulos del programa académico. especialidad alimenta el filtro/buscador del sitio.';

-- ============================================================
-- inscripciones_modulo
-- ============================================================
create table public.inscripciones_modulo (
  id serial primary key,
  boleto_id int not null references public.boletos (id),
  modulo_id int not null references public.modulos (id),
  fecha_inscripcion timestamptz not null default now(),
  -- Un boleto no puede inscribirse dos veces al mismo módulo.
  unique (boleto_id, modulo_id)
);
comment on table public.inscripciones_modulo is 'Tabla intermedia N:M entre boletos y modulos.';

-- ============================================================
-- concursos
-- ============================================================
create table public.concursos (
  id serial primary key,
  nombre text not null check (char_length(nombre) <= 200),
  descripcion text,
  categoria_tags text[],
  archivo_bases_pdf text,
  fecha_limite date
);
comment on table public.concursos is 'Reto del León, Fotografías en Salud, Trabajos Libres de Cartel.';

-- ============================================================
-- inscripciones_concurso
-- ============================================================
create table public.inscripciones_concurso (
  id serial primary key,
  concurso_id int not null references public.concursos (id),
  nombre_equipo text not null check (char_length(nombre_equipo) <= 200),
  capitan_nombre text not null check (char_length(capitan_nombre) <= 200),
  capitan_correo text not null check (char_length(capitan_correo) <= 254),
  fecha_inscripcion timestamptz not null default now()
);
comment on table public.inscripciones_concurso is 'Inscripción vía formulario web, sin depender de cuentas de usuario.';

-- ============================================================
-- cursos_talleres
-- ============================================================
create table public.cursos_talleres (
  id serial primary key,
  nombre text not null check (char_length(nombre) <= 200),
  descripcion text,
  archivo_url text
);
comment on table public.cursos_talleres is 'Cursos y talleres, misma lógica de tarjeta/descarga que modulos.';

-- ============================================================
-- sedes
-- ============================================================
create table public.sedes (
  id serial primary key,
  nombre text not null check (char_length(nombre) <= 200),
  direccion text,
  imagen_url text,
  coordenadas point
);
comment on table public.sedes is 'Las 4 ubicaciones del congreso.';

-- ============================================================
-- comite_organizador
-- ============================================================
create table public.comite_organizador (
  id serial primary key,
  nombre text not null check (char_length(nombre) <= 200),
  cargo text,
  foto_url text,
  bio text
);
comment on table public.comite_organizador is 'Miembros del comité organizador mostrados en /congreso.';

-- ============================================================
-- certificados
-- ============================================================
create table public.certificados (
  id serial primary key,
  boleto_id int not null unique references public.boletos (id),
  tipo text not null check (tipo in ('asistente', 'ponente', 'ganador_concurso')),
  horas numeric(5, 2),
  fecha_emision timestamptz
);
comment on table public.certificados is 'Un certificado por boleto. Se genera al vuelo desde el servidor, nunca se deja en una ruta pública.';

-- ============================================================
-- patrocinadores
-- ============================================================
create table public.patrocinadores (
  id serial primary key,
  nombre text not null check (char_length(nombre) <= 200),
  logo_url text,
  link_externo text,
  nivel text check (nivel in ('oro', 'plata', 'bronce'))
);
comment on table public.patrocinadores is 'nivel es opcional: no todos los patrocinadores tienen jerarquía oro/plata/bronce.';

-- ============================================================
-- mensajes_contacto
-- ============================================================
create table public.mensajes_contacto (
  id serial primary key,
  nombre text not null check (char_length(nombre) <= 200),
  correo text not null check (char_length(correo) <= 254),
  mensaje text not null check (char_length(mensaje) between 1 and 5000),
  atendido boolean not null default false,
  fecha timestamptz not null default now()
);
comment on table public.mensajes_contacto is 'Formulario de contacto público.';

-- ============================================================
-- Índices — folio, correo, estado y tipo (los campos por los que se busca),
-- más los de llave foránea que Postgres no crea automáticamente.
-- ============================================================

-- boletos: folio y certificados.boleto_id ya quedan indexados por sus UNIQUE.
create index idx_boletos_correo on public.boletos (correo) where correo is not null;
create index idx_boletos_estado on public.boletos (estado);
create index idx_boletos_tipo on public.boletos (tipo);
create index idx_boletos_orden_id on public.boletos (orden_id) where orden_id is not null;
create index idx_boletos_lote_id on public.boletos (lote_id) where lote_id is not null;

-- ordenes_compra
create index idx_ordenes_compra_correo on public.ordenes_compra (correo_comprador);
create index idx_ordenes_compra_estado on public.ordenes_compra (estado);

-- codigos_verificacion: correo se consulta en cada intento; expira_en lo usa el job de purga.
create index idx_codigos_verificacion_correo on public.codigos_verificacion (correo);
create index idx_codigos_verificacion_expira_en on public.codigos_verificacion (expira_en);

-- lotes_boletos
create index idx_lotes_boletos_tipo on public.lotes_boletos (tipo);

-- modulos: especialidad alimenta el filtro/buscador (sección 3.1 del mapa del sitio).
create index idx_modulos_especialidad on public.modulos (especialidad) where especialidad is not null;

-- inscripciones_modulo / inscripciones_concurso: llaves foráneas usadas en joins frecuentes.
create index idx_inscripciones_modulo_boleto_id on public.inscripciones_modulo (boleto_id);
create index idx_inscripciones_modulo_modulo_id on public.inscripciones_modulo (modulo_id);
create index idx_inscripciones_concurso_concurso_id on public.inscripciones_concurso (concurso_id);

-- mensajes_contacto: el panel admin filtra por atendido/no atendido.
create index idx_mensajes_contacto_atendido on public.mensajes_contacto (atendido);
