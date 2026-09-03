-- Fase 4 — Pagos con Stripe (modo prueba). Compra digital: verificación de
-- correo -> checkout -> webhook verificado. Todavía NO se generan boletos
-- (eso es Fase 5) -- el webhook solo registra la orden en ordenes_compra.

-- ============================================================
-- precios_boleto: precio parametrizable en base de datos, nunca fijo en
-- código (BRIEF.md sección "Pendientes": ni el precio final ni si hay
-- categorías -estudiante/residente/especialista- están decididos todavía).
-- tipo_boleto queda restringido a 'digital' porque es el único tipo que se
-- vende vía Stripe -- físico/beca/colchón se generan por lote sin pago.
-- ============================================================
create table public.precios_boleto (
  id serial primary key,
  tipo_boleto text not null default 'digital' check (tipo_boleto = 'digital'),
  categoria text not null check (char_length(categoria) between 1 and 60),
  precio_centavos int not null check (precio_centavos >= 0),
  moneda text not null default 'mxn' check (moneda = 'mxn'),
  activo boolean not null default true,
  modificado_por int references public.administradores (id),
  fecha_modificacion timestamptz not null default now(),
  unique (tipo_boleto, categoria)
);
comment on table public.precios_boleto is 'Precio por categoría del boleto digital. Parametrizable: el comité aún no confirma precio ni categorías -- se agregan/editan filas aquí, nunca en código.';

-- ============================================================
-- sesiones_compra: fija el correo verificado del lado del servidor para el
-- resto del flujo de compra. El cliente solo recibe un token opaco (bearer);
-- el correo real vive únicamente en esta fila, nunca vuelve a confiarse en
-- lo que mande el cuerpo de la petición.
-- ============================================================
create table public.sesiones_compra (
  id serial primary key,
  correo text not null check (char_length(correo) <= 254),
  token_hash text not null unique,
  expira_en timestamptz not null,
  fecha_creacion timestamptz not null default now()
);
comment on table public.sesiones_compra is 'Sesión de compra: se crea al validar el código de 6 dígitos. token_hash es el hash del token que recibe el cliente; el correo queda fijado aquí, no en el cuerpo de peticiones futuras.';

create index idx_sesiones_compra_expira_en on public.sesiones_compra (expira_en);

-- ============================================================
-- eventos_stripe_procesados: idempotencia por event.id. Stripe reintenta
-- webhooks -- sin esto, un reintento podría procesar la misma compra dos
-- veces.
-- ============================================================
create table public.eventos_stripe_procesados (
  id text primary key,
  tipo text not null,
  fecha_procesado timestamptz not null default now()
);
comment on table public.eventos_stripe_procesados is 'Un renglón por event.id de Stripe ya procesado. INSERT falla con 23505 (unique_violation) en un reintento -- así el webhook detecta el duplicado sin reprocesar.';

-- ============================================================
-- ordenes_compra: ajustes para el flujo de PaymentIntent + Stripe Elements.
-- stripe_payment_intent_id deja de ser NOT NULL porque la orden se inserta
-- en estado 'pendiente' ANTES de llamar a la API de Stripe (para reservar
-- cupo dentro de una transacción de base de datos primero); se completa con
-- un UPDATE justo después de crear el PaymentIntent.
-- ============================================================
alter table public.ordenes_compra
  alter column stripe_payment_intent_id drop not null;

alter table public.ordenes_compra
  add column categoria text not null default 'general' check (char_length(categoria) between 1 and 60),
  add column precio_unitario_centavos int not null default 0 check (precio_unitario_centavos >= 0);

comment on column public.ordenes_compra.categoria is 'Categoría de precio aplicada (precios_boleto.categoria) al momento de la compra.';
comment on column public.ordenes_compra.precio_unitario_centavos is 'Precio unitario vigente al momento de crear la orden, en centavos -- snapshot para auditoría, independiente de cambios posteriores en precios_boleto.';
