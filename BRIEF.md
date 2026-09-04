# Brief del proyecto — CICOM

## Qué estamos construyendo

Sitio web y sistema de boletos para el **CICOM** (Ciclo de Conferencias Médicas), congreso anual organizado por las sociedades de médicos residentes del Antiguo Hospital Civil de Guadalajara "Fray Antonio Alcalde" y el Nuevo Hospital Civil "Juan I. Menchaca". Alrededor de 6,000 asistentes por edición: estudiantes de medicina, internos, pasantes, residentes y especialistas.

Se reconstruye **desde cero**. No se migra ni se integra nada del sitio anterior.

## Referencia: el sitio de la edición pasada

`https://leonesporlasalud.com.mx` (edición XXXIII). Se toma como referencia de **contenido y estructura**, no de implementación.

**Estructura que tenía:**

```
Inicio
Congreso ▾  → Comité Organizador · Mensaje de Bienvenida · Profesora Homenajeada
Programas ▾ → Programa Académico General (PDF) · Módulos · Cursos Talleres
Concursos ▾ → Reto del León · Fotografías en Salud · Trabajos Libres de Cartel
Sedes
Compra en línea
[Inscripción]  → sistema externo, en otro subdominio
```

Home en este orden: hero con edición/fechas/estado → profesor homenajeado (foto, bio, "Ver más") → mensaje de bienvenida (foto, bio, "Ver más") → módulos (carrusel de tarjetas con ícono) → concursos (3 tarjetas con tags y descripción) → cursos y talleres (carrusel) → sedes (carrusel de 4) → footer.

## Qué estaba mal y qué mejoramos

| Problema del sitio anterior | Mejora |
|---|---|
| Contenido casi todo en imágenes; texto no indexable por buscadores | Contenido real en HTML, metaetiquetas por página, sitemap |
| Inscripción y compra en **dos sistemas externos** distintos (`registro.cicomhcg.com` y `/inscribirse`) | Todo integrado en un solo sistema con base de datos propia |
| 39 módulos como lista plana, cada uno abre un PDF | Módulos consultables en el sitio, con buscador y filtro por especialidad |
| Programa académico solo como PDF gigante | Agenda navegable en el sitio; el PDF queda como descarga adicional |
| Concursos con un PDF de contrato que se llena a mano | Formularios web reales, datos a base de datos |
| Actualizar el sitio cada edición requiere un desarrollador | Panel de administración: el comité actualiza módulos, ponentes, sedes y precios sin tocar código |
| Sistemas cerrados muestran errores crudos ("Congreso finalizado") | Estados manejados con elegancia |
| Sitio "de temporada", muerto el resto del año | Sección histórica de ediciones anteriores |

## Stack

- **Next.js** (App Router, TypeScript, Tailwind) — frontend y rutas de API en el mismo proyecto
- **Supabase** — PostgreSQL + Storage (buckets privados). Plan Pro en producción
- **Stripe** — pagos. Sin facturación CFDI
- **Resend** — correo transaccional (~15,000 envíos estimados)
- **Upstash Redis** — contador compartido de rate limiting
- **Cloudflare Turnstile** — anti-bot
- **Vercel** — hosting y despliegue automático desde GitHub
- Dominio: `leonesporlasalud.com.mx` (GoDaddy)

## Modelo de datos y reglas de negocio

**No existen cuentas de usuario.** El boleto *es* el registro. Roles: público (sin sesión) · `admin` · `superadmin`.

**Cuatro tipos de boleto**, cupo total 6,000, con tope configurable por tipo:

| Tipo | Cupo inicial | Cómo nace | Datos del asistente | Formato de descarga |
|---|---|---|---|---|
| `digital` | 1,500 | Compra en línea vía Stripe | Se capturan al comprar | — |
| `fisico` | 2,500 | Lote generado por superadmin | Se capturan al activar | PDF con boletos diseñados, uno por página (va a imprenta) |
| `beca_residente` | 1,500 | Lote generado por superadmin | Se capturan al activar | Excel con folio y contraseña en columnas |
| `colchon` | 500 | Lote generado por superadmin | Se capturan al activar | Excel con folio y contraseña en columnas |

Los cupos por tipo son **configurables por el superadmin**, respetando siempre el total de 6,000. Si un tipo no se agota, su cupo puede moverse a otro sin tocar código. Los boletos digitales no tienen inventario previo: folio y contraseña se generan al confirmarse cada pago, así que el único límite real es el cupo asignado a ese tipo.

Cada boleto lleva **folio + contraseña**. No hay código QR. La contraseña es la llave para activar el boleto y, al cierre del congreso, para descargar el certificado.

**Flujos críticos:**

1. **Compra digital** — el usuario da su correo → recibe código de 6 dígitos → lo valida → se desbloquea el checkout con el correo precargado y bloqueado → paga con Stripe → el **webhook verificado** dispara la generación del folio y contraseña → se dibujan sobre la plantilla del boleto → se descarga y se envía por correo. **Un boleto por compra**: el certificado es individual y se accede con el correo del boleto, así que no se vende más de uno por transacción. Quien quiera varios hace varias compras, cada una con su propio correo verificado.
2. **Generación de lotes** — el superadmin genera N boletos de un tipo, respetando el cupo configurado → el sistema entrega **una sola vez** el archivo de reparto: PDF con boletos diseñados para `fisico`, Excel con folio y contraseña en columnas para `beca_residente` y `colchon` → en la base de datos solo queda el hash. El archivo contiene credenciales en claro y debe tratarse como tal: descarga única, URL firmada de vida corta y auditoría de quién lo descargó.
3. **Activación** — quien recibió un boleto pre-generado entra con folio + contraseña y captura nombre y correo. Solo procede si el boleto está en estado `disponible`; uno ya `vendido` no se puede sobrescribir.
4. **Certificado** — correo + contraseña del boleto → se genera el PDF al vuelo, con el nombre ya registrado superpuesto sobre la plantilla → se ve en pantalla y se descarga.

**Datos personales tratados: solo nombre completo y correo.** Nada más (minimización, LFPDPPP).

El esquema completo de las tablas está en `Mapa_Sitio_y_Requerimientos_CICOM.md`. Se agrega una tabla más, `cupos_boleto`, para los topes configurables por tipo:

| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| tipo | text, unique | fisico / beca_residente / colchon / digital |
| cupo_maximo | int | modificable solo por superadmin; la suma no puede exceder 6,000 |
| modificado_por | FK → administradores.id | auditoría |
| fecha_modificacion | timestamp | |

## Reglas no negociables

Están en `CLAUDE.md` y gobiernan todo el desarrollo. Las cinco que más aplican aquí:

1. El precio se calcula **en el servidor**. El monto que venga del cliente se ignora.
2. El boleto se emite **solo** al recibir el webhook de Stripe con firma verificada, nunca en la redirección de éxito del navegador.
3. Las contraseñas de boleto se guardan **hasheadas** (Argon2id). El texto plano existe solo en memoria, el tiempo de dibujarlo en el PDF.
4. El cupo de 6,000 se valida **dentro de la misma transacción** que crea los boletos.
5. El frontend **nunca** habla directo con Supabase. Todo pasa por rutas de API del servidor.

## Pendientes que aún no tienen respuesta

No bloquean el desarrollo, pero hay que dejarlos parametrizables:

- Fecha límite de inscripción: sin definir. El tramo de precio de noviembre queda vigente indefinidamente hasta que el comité lo cierre o agregue un tramo nuevo
- Si el certificado se bloquea hasta el cierre del congreso
- Si hay validación de entrada física al evento
- Verificación de Stripe (datos fiscales del comité) — se desarrolla en modo prueba mientras tanto
- Confirmar si los 6,000 son aforo físico estricto o meta de venta

**Resuelto por el comité:** precio del boleto digital por tramos de fecha (septiembre $550, octubre $650, noviembre $700 MXN), parametrizado en la tabla `precios_boleto` — no fijo en código. Sin categorías (estudiante / residente / especialista): un boleto por compra, sin selector, a nombre del correo verificado.

---
