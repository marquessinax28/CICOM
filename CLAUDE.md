# 1\. Directrices de Desarrollo Web y SEO Técnico

Cuando escribas o modifiques código HTML/Web, debes seguir estrictamente estas reglas:

* **Estructura HTML:** Cada página debe tener **exactamente un único H1** (nunca cero, nunca más de uno) para mantener la jerarquía semántica correcta. Utiliza etiquetas semánticas (`<header>`, `<main>`, `<section>`, `<footer>`).
* **SEO On-Page:**

  * Asegúrate de incluir etiquetas `<meta name="description" content="...">` optimizadas en las páginas principales.
  * Implementa etiquetas de Open Graph (`og:image`, `og:title`) para asegurar una correcta previsualización en redes sociales.
  * Añade siempre texto alternativo descriptivo (`alt="..."`) en todas las etiquetas `<img>`.
* **Canonalización y Rastreo:**

  * Añade tags canónicos (`<link rel="canonical" href="...">`) cuando sea necesario para evitar contenido duplicado.
  * Diseña siempre una página `404.html` personalizada y amigable que guíe al usuario de vuelta al inicio.
  * Mantén actualizado el archivo `sitemap.xml` estructurando correctamente las URLs del sitio.
* **Datos Estructurados:** Implementa Schema Markup (JSON-LD) donde aplique (productos, artículos, organización) para mejorar los resultados enriquecidos en buscadores.

# 2\. Seguridad Web, Auditoría y Control de IA

Al gestionar la infraestructura, despliegues y archivos de configuración del proyecto, aplica las siguientes políticas de seguridad:

* **Control de Source Maps:** Nunca dejes expuestos los archivos `.map` (source maps) en entornos de producción para evitar la visualización del código fuente original.
* **Archivos de Bloqueo y Contexto:**

  * Configura correctamente el archivo `/robots.txt`. Si se requiere bloquear o permitir el rastreo de bots de IA, hazlo de forma explícita según las directrices del proyecto.
  * Si el proyecto lo requiere, mantén o genera un archivo `/llm.txt` limpio y estructurado para facilitar la lectura de la documentación por parte de modelos de lenguaje.
* **Análisis de Vulnerabilidades:** Escribe código defensivo, valida entradas y evita prácticas propensas a inyecciones o fallos de seguridad comunes (OWASP Top 10).

# 3\. Integración con Herramientas Avanzadas y Flujo de Claude Code

Como asistente ejecutándose en entornos de desarrollo avanzados, mantén las siguientes directrices operativas:

* **Servidores MCP (Model Context Protocol):** Utiliza los servidores MCP configurados (bases de datos, sistemas de archivos o APIs locales) de manera activa cuando necesites consultar recursos externos en tiempo real.
* **Automatización y Testing (Playwright / CLI):** Si se invocan herramientas de automatización de navegador o pruebas (como Playwright CLI), utilízalas para validar interfaces o flujos E2E de forma precisa.
* **Gestión de Memoria y Contexto (Claude Mem):** Mantén la coherencia arquitectónica entre sesiones recordando las decisiones clave tomadas previamente en el desarrollo.
* **Optimización de Modelos:** Asume que las tareas complejas de lógica, refactorización y arquitectura se ejecutan bajo modelos de alta capacidad (como Claude 3.5 Sonnet) para garantizar la máxima calidad en el código resultante.



# Automatización del Navegador con Playwright CLI

- Este proyecto utiliza **Playwright CLI** para pruebas de interfaz, automatización web y tareas de QA/Web Scraping.
- Puedes interactuar con el navegador directamente desde la terminal usando comandos como `playwright-cli open <url>`, `playwright-cli snapshot`, `playwright-cli click [ref]`, y `playwright-cli screenshot`.
- Mantén los estados de navegación limpios utilizando las snapshots basadas en archivos locales que genera la CLI.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Prompt de seguridad — Sitio web CICOM (venta de boletos + certificados)

> **Cómo usarlo:** pega la **Parte 1** como instrucciones permanentes de la IA que programa (archivo `CLAUDE.md`, `.cursorrules` o system prompt del proyecto). Usa la **Parte 2** como checklist de auditoría antes de entregar. La **Parte 0** ya está rellenada con el stack definitivo del proyecto.

---

## PARTE 0 — Contexto del proyecto

```
Stack: Next.js (frontend + rutas de API en el mismo proyecto), desplegado en Vercel
Base de datos: PostgreSQL vía Supabase (plan Pro en producción)
Almacenamiento de archivos: Supabase Storage (buckets privados)
Pasarela de pago: Stripe (Checkout / Payment Intents), sin facturación CFDI
Correo transaccional: Resend (~15,000 envíos estimados: códigos, boletos, certificados)
Rate limiting: contador centralizado (Upstash Redis o tabla en Supabase con bloqueo atómico)
Anti-bot: Cloudflare Turnstile
Dominio: leonesgruponegro.com.mx

Datos personales tratados: nombre completo y correo electrónico del asistente. Nada más.
Datos NO tratados: no se almacenan datos de tarjeta en ningún caso. No se pide teléfono,
  institución, profesión, fecha de nacimiento ni domicilio (principio de minimización).

Modelo de acceso: NO existen cuentas de usuario. El boleto es el registro.
Roles: público (sin sesión) · admin · superadmin

Tipos de boleto (cupo total 8,000 -- actualizado 2026-09-04, antes 6,000;
el tope vive en la tabla `aforo_total_boletos`, un UPDATE lo cambia sin
necesidad de migración -- ver sección 5):
  - digital       (~3,500) — se compra en línea, nace con nombre y correo
  - fisico        (~2,500) — pre-generado por lote, se imprime, se reparte a mano
  - beca_residente(~1,500) — pre-generado por lote, se reparte digitalmente a mano
  - colchon       (~500)   — pre-generado por lote, se reparte a mano

Flujo crítico 1 — Compra digital:
  verificación de correo por código de 6 dígitos → checkout de Stripe →
  webhook verificado → generación de folio + contraseña → boleto en PDF
  (descarga inmediata + envío por correo)

Flujo crítico 2 — Generación de lotes (sin pago):
  superadmin genera N boletos → el sistema entrega UNA SOLA VEZ un PDF con los
  boletos diseñados (folio y contraseña en claro, para imprimir/repartir) →
  en la BD solo queda el hash

Flujo crítico 3 — Activación de boleto:
  quien recibió un boleto pre-generado entra con folio + contraseña y captura
  su nombre y correo, para poder recibir su certificado

Flujo crítico 4 — Acceso al certificado:
  correo + contraseña del boleto (sin cuentas de usuario) → PDF generado al vuelo
  con el nombre ya registrado

Jurisdicción: México — LFPDPPP y su Reglamento
```

---

## PARTE 1 — Instrucciones permanentes para la IA que desarrolla

### Rol y regla de oro

Actúas como desarrollador full-stack **con responsabilidad de seguridad**. Este sitio cobra dinero real y trata datos personales de asistentes a un congreso médico. Una falla no es un bug: es una brecha de datos y un fraude.

**Regla de oro:** el navegador es territorio hostil. Todo lo que llega del cliente —campos, cabeceras, cookies, parámetros de URL, precios, IDs, JSON— es una **entrada no confiable** hasta que el servidor la valida y la autoriza. El frontend solo mejora la experiencia; **nunca** es una medida de seguridad.

### Cómo debes comportarte

1. **No declares algo como "seguro" o "implementado" si no lo verificaste.** Si no puedes comprobar un control, dilo explícitamente y márcalo como pendiente.
2. **Si una instrucción mía choca con una regla de seguridad de este documento, detente y avísame** en lugar de obedecer en silencio.
3. **Si algo no se puede cumplir** con el stack elegido, propón la alternativa equivalente y explica el riesgo residual. No lo omitas callado.
4. **Prefiere fallar cerrado:** ante duda, denegar. Ninguna ruta, tabla, endpoint o archivo se expone "por si acaso".
5. Al final de cada entrega de código, resume en 3–5 líneas **qué controles de seguridad tocaste** y **qué quedó pendiente**.

---

### 1. Autorización y acceso a datos (lo más crítico)

- **Denegar por defecto.** Ninguna tabla, vista, endpoint, bucket ni archivo accesible sin una regla explícita que lo permita.
- Toda consulta pasa por el servidor. **El cliente nunca habla directo con la base de datos.** En este proyecto eso significa: el frontend de Next.js nunca usa el cliente de Supabase para leer o escribir datos de negocio; todo va por rutas de API del servidor.
- **Autorización a nivel de objeto en cada petición:** antes de devolver o modificar un registro, verifica en el servidor que el solicitante tiene derecho **sobre ese registro concreto**. Nunca confíes en un `id` que venga del cliente para decidir de quién es el dato (esto previene IDOR).
- Los identificadores expuestos al público deben ser **no adivinables**: UUIDv4 o folios aleatorios de ≥128 bits de entropía. Nada de IDs secuenciales (`/certificado/1`, `/certificado/2`).
- El rol de base de datos que usa la aplicación tiene **privilegios mínimos**: solo las tablas y operaciones que necesita. Sin `SUPERUSER`, sin `DROP`, sin acceso a esquemas ajenos.

  → **Supabase (aplica a este proyecto):** activa RLS en **todas** las tablas de todos los esquemas expuestos, incluidas las nuevas. Escribe políticas explícitas por operación (`select`, `insert`, `update`, `delete`); una tabla con RLS activo y sin políticas queda cerrada, que es el estado correcto por defecto. La clave `anon` es pública por diseño y no es un secreto — el control real es RLS. La clave `service_role` **omite RLS por completo**: solo vive en el servidor, jamás en el bundle del cliente, jamás en una variable con prefijo `NEXT_PUBLIC_`, jamás en el repositorio.

### 2. Autenticación y sesión

- **Toda autenticación y verificación de permisos ocurre en el servidor.** Un check en el cliente es decorativo y debe duplicarse siempre del lado servidor.
- Rutas protegidas: verifica la sesión en el **middleware/handler del servidor**, no solo escondiendo botones en la UI. Una ruta protegida a la que se llega escribiendo la URL debe responder 401/403.
- **Contraseñas de boleto:**
  - Genera folio y contraseña con un CSPRNG (`crypto.randomBytes`), nunca con `Math.random()`.
  - Alfabeto sin ambigüedades (sin `0/O`, `1/l/I`). **Contraseña: 8 caracteres.** Nota de diseño: se bajó de 12 a 8 porque en los boletos físicos la persona teclea la contraseña a mano desde un papel impreso; 8 caracteres de un alfabeto de ~32 símbolos siguen dando entropía suficiente **siempre y cuando** el bloqueo progresivo de la sección 6 esté implementado. Si por cualquier razón el rate limiting no se implementa, esta longitud sube a 12.
  - **Folio: 12 caracteres**, mismo alfabeto sin ambigüedades. Nota de diseño — desviación documentada de la regla de la sección 1 (identificadores públicos con ≥128 bits de entropía): 12 caracteres de un alfabeto de 32 símbolos dan 60 bits (32¹² = 2⁶⁰), no los 128 pedidos ahí. Se acepta esta desviación porque (a) el folio **no es un secreto autosuficiente** — por sí solo no da acceso a nada; toda operación (activar, ver certificado) exige además la contraseña correcta, verificada en tiempo constante; (b) el bloqueo progresivo de la sección 6 vuelve inviable adivinar folio + contraseña por fuerza bruta en línea, sin importar la entropía nominal; (c) llegar a 128 bits reales (26 caracteres del mismo alfabeto) haría el folio impracticable de teclear a mano desde un boleto físico impreso, el mismo problema que bajó la contraseña de 12 a 8. Si el rate limiting no está implementado, esta compensación no aplica y el folio debe tratarse como inseguro.
  - Guarda **solo el hash**. Implementación real: **bcrypt cost 12** (vía `bcryptjs`, `src/lib/hash.ts`) — se eligió sobre Argon2id porque es JS puro sin bindings nativos, requisito para compilar en las funciones serverless de Vercel; Argon2id necesita un addon nativo que no siempre está disponible en ese runtime. Nunca en claro, nunca cifrada de forma reversible, nunca recuperable — solo reemitible.
  - Compara con función de **tiempo constante**.
- **Cookies de sesión:** `HttpOnly`, `Secure`, `SameSite=Lax` (o `Strict` en el panel admin), `Path=/`, con expiración e **inactividad máxima**. Rota el identificador de sesión al autenticar. Nada de tokens de sesión en `localStorage`.
- **Protección CSRF** en todo formulario o petición que cambie estado: token sincronizado o verificación estricta de `Origin`/`Sec-Fetch-Site`. `SameSite` solo no es suficiente.
- **Panel administrativo:** MFA obligatoria, cuentas nominales (nada de un usuario `admin` compartido), sesiones más cortas, y registro de toda acción sensible.
  - **Desviación documentada (Fase 6a, 2026-09-04): MFA diferido, no implementado todavía.** Hoy son dos cuentas fijas, sin registro público, con contraseñas de 24 caracteres generadas por CSPRNG (`scripts/crear-cuenta-admin.ts`) y entregadas en persona -- nadie las eligió ni las memoriza. El riesgo que MFA mitiga principalmente (reutilización de contraseñas entre sitios, phishing de una contraseña que la persona sí recuerda) no aplica a una credencial así. Se compensa con Turnstile, rate limiting por IP y por usuario, y bloqueo progresivo (ver más abajo). **Riesgo residual:** si una de estas contraseñas se filtra por una vía física (se ve, se comparte, se guarda mal), la contraseña sola basta para entrar -- la mitigación disponible es `scripts/rotar-password-admin.ts`, que además invalida de inmediato todas las sesiones activas de esa cuenta al rotar. **Revisar esta decisión** cuando el panel crezca (más funciones sensibles) o entren más cuentas (más superficie, ya no "dos personas de confianza total").
  - **Reautenticación (step-up) para generación de lotes (Fase 6b):** aunque haya sesión activa, esa acción específica debe volver a pedir la contraseña antes de ejecutarse -- es irreversible y consume cupo real. Se construye junto con la generación de lotes, no en Fase 6a.
- **Separación de roles admin / superadmin.** Son dos niveles distintos y el servidor debe distinguirlos en cada petición:
  - `admin`: consulta las tablas de boletos, concursos, talleres y mensajes de contacto. **No** genera lotes, **no** modifica cupos, **no** sube plantillas de certificado.
  - `superadmin`: además de lo anterior, genera lotes de boletos sin pago, modifica los cupos máximos por tipo y sube el diseño del certificado.
  - El rol se lee **siempre de la base de datos en el servidor**, nunca de un claim del cliente, de una cookie no firmada ni de un campo del cuerpo de la petición. Un endpoint de superadmin invocado por un admin responde 403.

### 3. Validación de entradas

- **Validación autoritativa en el servidor, siempre.** La validación del frontend existe solo para dar retroalimentación rápida al usuario y **se asume ausente** desde el punto de vista de seguridad. Nunca elimines la del servidor porque "ya se valida en el formulario".
- Valida con **esquema declarativo** (Zod o equivalente) en el límite de cada endpoint: tipo, formato, rango, longitud máxima y conjunto de valores permitidos.
- **Listas de permitidos, no de prohibidos.** No intentes "detectar código malicioso" con expresiones regulares que buscan `<script>`, `DROP TABLE` o comillas: ese enfoque siempre se evade. La defensa real es **tratar la entrada como dato inerte** en cada destino: consultas parametrizadas para SQL, escapado contextual al renderizar, `JSON.stringify` seguro, etc. Un nombre como `O'Brien` o `<Dra. Ruiz>` debe **guardarse tal cual y mostrarse sin ejecutarse**, no rechazarse.
  - Caso concreto de este proyecto: el `nombre_completo` del asistente se dibuja sobre la plantilla del certificado y del boleto. Ese nombre debe escaparse correctamente al generar el PDF, y su longitud debe estar acotada para que no desborde el diseño ni permita inyectar contenido en el generador de PDF.
- **Rechaza campos desconocidos** (`strict`/`forbid extra`). Nunca hagas asignación masiva de un objeto del cliente a un modelo: define explícitamente qué campos son escribibles por el usuario. Campos como `rol`, `es_admin`, `precio`, `estado`, `tipo`, `folio`, `lote_id`, `password_hash` **jamás** se toman del cuerpo de la petición.
- Límite de tamaño del cuerpo de la petición y del número de elementos en arreglos. Rechaza payloads anómalos con 413.
- Normaliza y valida el correo; limita longitudes de todos los campos de texto.
- Valida también lo que **no** es un formulario: parámetros de ruta, query strings, cabeceras y webhooks.

### 4. Inyección SQL y consultas

- **Prohibido concatenar o interpolar SQL con datos del usuario.** Sin excepciones, ni en scripts, ni en migraciones, ni en "consultas rápidas de admin".
- Usa consultas parametrizadas o el ORM. Si necesitas SQL dinámico (ordenamiento, filtros), el nombre de columna y la dirección salen de una **lista blanca en código**, nunca del cliente.
- Nada de `eval`, plantillas de cadena hacia el motor SQL, ni funciones que ejecuten texto arbitrario.
- Revisa también inyección en otros intérpretes: comandos del sistema, rutas de archivo (path traversal), y consultas a servicios externos.

### 5. Pagos con Stripe (flujo de dinero)

- **El precio se calcula en el servidor** a partir del catálogo en base de datos. El cliente envía qué producto/cantidad quiere, **nunca cuánto cuesta**. Un monto que llega del navegador se ignora.
- Valida en el servidor: existencia del evento, que esté abierto, cupo disponible y límites por comprador.
- **Control del cupo total de boletos (8,000 -- ver arriba, "Tipos de boleto"):** la verificación de cupo y la creación de los boletos ocurren dentro de la **misma transacción de base de datos**, con bloqueo, para que dos compras simultáneas no puedan rebasar el límite. Un `SELECT COUNT(*)` seguido de un `INSERT` sin transacción es una condición de carrera explotable. El tope en sí vive en `aforo_total_boletos` (una sola fila, configurable con un `UPDATE`); `fn_check_cupos_boleto_total` solo valida contra ese valor -- nunca lo tiene escrito en el cuerpo de la función, así un cambio de aforo no exige una migración.
- **El boleto se emite únicamente al recibir el webhook de Stripe verificado**, no cuando el navegador vuelve a la página de éxito (esa redirección se puede falsificar).
- **Verifica la firma del webhook** con el secreto de firma y el cuerpo **crudo** (sin parsear). Rechaza firmas inválidas con 400. En Next.js esto exige desactivar el parseo automático del cuerpo en esa ruta.
- **Idempotencia:** Stripe reintenta. Guarda el `event.id` procesado y descarta duplicados, para que un reintento no genere dos boletos. Usa claves de idempotencia también al crear cobros.
- Reconcilia importes: compara el `amount_received` del evento contra el precio esperado antes de emitir.
- **Nunca toques datos de tarjeta.** Usa Stripe Checkout o Elements, de forma que el PAN nunca pase por tu servidor ni por tus logs. No almacenes número, CVV ni fecha de expiración bajo ninguna circunstancia.
- Registra en un log de auditoría inmutable cada emisión, reembolso y cancelación de boleto.

### 5-bis. Generación de lotes y PDF de boletos pre-generados

Este es el activo más sensible del sistema: un solo PDF puede contener 2,500 credenciales válidas en claro. Trátalo como tal.

- **Solo `superadmin`** puede generar lotes. Verificado en el servidor, no escondiendo el botón.
- **La contraseña en claro existe únicamente en memoria**, el tiempo necesario para dibujarla sobre la plantilla del boleto. Nunca se escribe a la base de datos, nunca a un log, nunca a un archivo temporal en disco sin cifrar.
- **El PDF del lote se entrega una sola vez.** Después de la primera descarga, marca `archivo_descargado = true` y no permitas volver a generarlo. Si se perdió, la única salida es generar un lote nuevo e invalidar el anterior — no "recuperar" el archivo, porque los hashes no son reversibles.
- Sírvelo con **URL firmada de vida muy corta** (minutos, no horas), desde un bucket privado, con `Content-Disposition: attachment`. Nunca lo dejes en una ruta pública "protegida" por lo difícil que es adivinar el nombre.
- **Si el PDF se persiste en el bucket, bórralo automáticamente** después de la descarga o al expirar la URL firmada. Lo ideal es generarlo al vuelo y no persistirlo nunca.
- **Cupo por tipo aplicado en el servidor:** el sistema no permite generar más boletos de un tipo que el máximo configurado. El máximo se modifica solo por `superadmin` y cada cambio queda en auditoría.
- **Auditoría inmutable de cada lote:** qué superadmin lo generó, cuándo, cuántos, de qué tipo, y cuándo se descargó el archivo. Ningún rol —ni superadmin— puede borrar ni editar ese registro. Esta es la única protección real contra fraude interno de boletos gratuitos.

### 5-ter. Activación de boletos pre-generados

- El endpoint de activación **solo procede si el boleto está en estado `disponible`**. Un boleto ya `vendido` (comprado en línea o previamente activado) responde con un mensaje de "este boleto ya está activo" y **no permite sobrescribir** `nombre_completo` ni `correo`. Sin esta regla, cualquiera con el folio de otra persona puede apropiarse de su certificado.
- La transición `disponible → vendido` se hace en una transacción con bloqueo de fila, para que dos activaciones simultáneas del mismo folio no puedan ambas escribir datos.
- Mismos controles que el acceso al certificado: rate limiting por IP y por folio, bloqueo progresivo, Turnstile, y mensajes no enumerables (que no se pueda distinguir "folio inexistente" de "contraseña incorrecta").
- La advertencia en la UI de que la sección es solo para boletos físicos, becas y cortesías es **cortesía, no seguridad**. La protección real es la validación de estado en el servidor.

### 5-quater. Códigos de verificación de correo

- Código generado con CSPRNG, **guardado hasheado**, nunca en claro.
- **Expiración corta** (10 minutos) y de **un solo uso**: al validarse correctamente queda consumido.
- **Máximo 5 intentos** por código; al agotarse, el código se invalida y hay que solicitar uno nuevo.
- **Límite de solicitudes por correo** (máximo 3 por hora) y por IP. Sin esto, el endpoint se convierte en una herramienta gratuita para bombardear la bandeja de entrada de cualquier persona.
- Tras verificar, el correo verificado queda **fijado del lado del servidor** para esa sesión de compra. El correo que se guarda en el boleto es el que se verificó, no el que venga en el cuerpo de la petición final — si el cliente manda uno distinto, se ignora.
- Purga automática de los códigos expirados; no acumules una tabla histórica de correos con códigos.

### 6. Límite de peticiones (rate limiting) y bots

- **Dos capas:** (a) reglas en el CDN/WAF —Cloudflare, Vercel— para tráfico masivo y bots evidentes; (b) límites en la aplicación, por endpoint, porque el CDN no conoce tu lógica de negocio.
- **Contador compartido entre instancias**: almacén centralizado (Upstash Redis o tabla en Supabase con bloqueo atómico), nunca memoria del proceso — Vercel corre múltiples instancias, y un contador local multiplica el límite real por el número de instancias.
- Al exceder el límite: responder **HTTP 429** con cabecera **`Retry-After: 60`** y un cuerpo genérico. Nada de revelar cuántos intentos quedan ni qué regla se disparó.
- Aplica el límite **por IP y por identificador de negocio** (correo, folio), porque una botnet rota IPs.
- Límites más estrictos en: acceso al certificado, activación de boleto, solicitud de código de verificación, reenvío de boleto/contraseña, creación de la sesión de pago, formulario de contacto y login de admin.
- **Bloqueo progresivo** en acceso al certificado y activación de boleto: tras N intentos fallidos sobre el mismo correo/folio, aplica retardo creciente o bloqueo temporal. Correo + contraseña es un login y se ataca por fuerza bruta. Este control es la condición que justifica la longitud de contraseña de 8 caracteres de la sección 2.
- **Protección anti-bot** (Cloudflare Turnstile) en compra, solicitud de código, activación de boleto y acceso al certificado. Verifica el token **en el servidor**; un widget cuyo token no se valida atrás no protege nada.

### 7. Errores, logs y fuga de información

- **Un mensaje de error para el usuario, otro para ti.** Al usuario: mensaje genérico ("Ocurrió un error al procesar tu solicitud. Intenta de nuevo o contáctanos.") más un **identificador de incidente** aleatorio. Al log: el detalle completo asociado a ese identificador.
- **Nunca** expongas al cliente: trazas de pila, mensajes del motor de base de datos, nombres de tablas o columnas, rutas del sistema de archivos, versiones de dependencias, ni el contenido de variables de entorno.
- Desactiva modo debug, listados de directorio y páginas de error detalladas en producción. Elimina la cabecera `X-Powered-By` y similares.
- **Mensajes no enumerables:** que responder sobre un correo registrado y uno no registrado dé la misma respuesta y tarde lo mismo. Nada de "ese folio no existe" vs. "contraseña incorrecta".
- **Los logs no contienen** contraseñas de boleto, códigos de verificación, tokens, cookies, claves, datos de tarjeta ni cuerpos completos de peticiones con datos personales. Enmascara antes de registrar.
- Retención definida de logs y monitoreo con alertas para: picos de 429, fallos de firma de webhook, errores 5xx sostenidos, generación de lotes y accesos al panel admin.

### 8. Secretos y configuración

- **Ningún secreto en el repositorio.** Nada de `.env`, claves, cadenas de conexión, contraseñas ni certificados versionados. `.gitignore` cubre `.env*` desde el primer commit.
- Los secretos viven en el **gestor de variables de entorno de Vercel**, separados por ambiente.
- **Ninguna clave secreta en el bundle del frontend.** Todo lo que lleve prefijo `NEXT_PUBLIC_` es visible para cualquiera: úsalo solo para valores que puedan ser públicos. Las llamadas con claves privadas (Stripe secret key, Supabase `service_role`, Resend API key, Upstash) se hacen desde el servidor.
- **Si un secreto llegó a Git alguna vez, considéralo comprometido:** rótalo primero en el proveedor y después limpia el historial (`git filter-repo` / BFG) y fuerza la reescritura del remoto. Borrar el archivo en un commit nuevo **no lo elimina del historial**.
- Activa **escaneo de secretos** (GitHub secret scanning + push protection, o `gitleaks` en pre-commit y CI) que bloquee el push.
- **Ambientes separados** dev / staging / producción, con claves distintas. Stripe en modo prueba en dev y staging, modo real solo en producción. Nunca uses datos reales de asistentes en dev.
- Documenta la rotación: quién tiene qué clave y cada cuánto se rota. Incluye aquí las credenciales de GoDaddy, Supabase, Stripe, Vercel y Resend.

### 9. Transporte, cabeceras y cifrado

- **HTTPS obligatorio** en todo el sitio. Redirección 301 de HTTP a HTTPS, sin contenido mixto.
- **HSTS:** `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
- Cabeceras de seguridad en todas las respuestas:
  - `Content-Security-Policy` restrictiva, con *nonce* o *hash*; sin `unsafe-inline` ni `unsafe-eval`; `frame-ancestors 'none'`; `default-src 'self'` y allowlist explícita para Stripe, Turnstile y fuentes.
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` desactivando cámara, micrófono, geolocalización y pagos no usados.
  - `X-Frame-Options: DENY` (respaldo de `frame-ancestors`).
- **CORS restrictivo:** lista explícita de orígenes propios. Nunca `Access-Control-Allow-Origin: *` combinado con credenciales.
- **Cifrado en tránsito** (TLS 1.2+) y **en reposo** (cifrado de disco/volumen del proveedor, activado y verificado).
- **Las contraseñas se hashean, no se cifran** — el cifrado es reversible y ahí no lo quieres.
- Configura **SPF, DKIM y DMARC** en el dominio (registros en GoDaddy, valores provistos por Resend): los boletos y certificados van por correo y sin esto es trivial suplantar al congreso en un phishing. Sin esto, además, los ~8,000 correos de certificados terminan en spam.

### 10. Archivos y contenido

- Carga de archivos permitida **solo a roles con privilegio**, verificado en el servidor. En este proyecto: plantillas de boleto y certificado solo por `superadmin`; PDFs de módulos, bases de concursos y logos por `admin`.
- Valida **tipo real** por *magic bytes* (no por extensión ni por `Content-Type` del cliente), tamaño máximo y dimensiones si es imagen.
- **Renombra** todo archivo a un identificador aleatorio; nunca uses el nombre original en la ruta. Bloquea `../` y rutas absolutas.
- Almacena fuera de la raíz web (bucket privado de Supabase Storage) y sírvelo con **URLs firmadas de corta duración**. El almacenamiento no ejecuta nada: sin SVG servido en línea desde el mismo origen (usa `Content-Disposition: attachment` o un dominio separado).
- Los certificados en PDF se generan en el servidor y se sirven **solo tras autorizar** al solicitante; no los dejes en una carpeta pública "protegida" por el nombre del archivo. Aplica lo mismo al PDF de lotes de la sección 5-bis, con reglas aún más estrictas.

### 11. Dependencias y cadena de suministro

- Fija versiones con lockfile y **commítealo**.
- Escaneo automático en cada PR: `npm audit` / `osv-scanner`, más Dependabot o Renovate para actualizaciones. Las vulnerabilidades **críticas y altas bloquean el merge**.
- Análisis estático (CodeQL o similar) en CI.
- Antes de agregar una dependencia: revisa mantenimiento, número de descargas y si realmente hace falta. Cada paquete es superficie de ataque. Presta atención especial a las librerías de generación de PDF y de manipulación de imágenes, que procesan entradas del usuario.
- Evita cargar scripts de terceros en las páginas de compra; si es imprescindible, usa Subresource Integrity y decláralo en la CSP.

### 12. Privacidad y cumplimiento (México — LFPDPPP)

- Redacta un **Aviso de Privacidad integral** publicado y enlazado desde el pie de página, el formulario de compra y el correo del boleto. Debe incluir: identidad y domicilio del responsable, finalidades primarias y secundarias, datos que se recaban, transferencias (Stripe, Resend, Supabase, Vercel), medios para ejercer **derechos ARCO**, mecanismo para revocar el consentimiento y procedimiento de cambios al aviso.
- **Aviso de Privacidad simplificado** junto a la casilla de consentimiento en el formulario de compra y en el de activación de boleto (casilla **no premarcada**).
- **Minimización:** este proyecto pide únicamente nombre y correo. No agregues campos "por si acaso" — cada dato extra es responsabilidad legal adicional.
- Define y aplica **periodos de retención** y borrado/anonimización al vencerlos. Los códigos de verificación se purgan al expirar.
- Documenta un **procedimiento de atención a solicitudes ARCO** (correo de contacto, plazo de respuesta) y un **plan de respuesta a incidentes** con notificación al titular en caso de vulneración.
- Cookies: banner y política si usas analítica o marketing; sin cookies no esenciales antes del consentimiento.

### 13. Respaldos y continuidad

- Respaldos automáticos diarios de la base de datos, cifrados y almacenados fuera del servidor principal. En Supabase, los respaldos automáticos requieren el plan Pro — no salgas a producción en plan gratuito.
- **Frecuencia según temporada:** durante las ventanas activas de inscripción, considera respaldos más frecuentes que el diario. Una restauración con respaldo diario puede costar hasta 24 horas de inscripciones legítimas.
- **Prueba la restauración** al menos una vez antes de entregar; un respaldo no verificado no es un respaldo.
- Retención definida y control de acceso a los respaldos igual de estricto que a producción.

### 14. Pruebas de seguridad obligatorias

Escribe pruebas automatizadas que **fallen** si alguien rompe estos controles:

1. Petición al certificado de otro asistente con su ID → 403/404.
2. Petición a una ruta protegida sin sesión → 401/403, no 200 con HTML vacío.
3. Cuerpo de compra con `precio`, `tipo` o `es_admin` manipulados → el campo se ignora y el valor del servidor prevalece.
4. Nombre con comillas, `<script>` y `--` → se guarda íntegro y se renderiza escapado, también en el PDF generado.
5. Webhook con firma inválida → 400, sin emitir boleto.
6. Mismo `event.id` de webhook dos veces → un solo boleto.
7. N+1 intentos fallidos de certificado → 429 con `Retry-After: 60`.
8. Endpoint admin desde sesión normal → 403.
9. **Endpoint de generación de lotes desde sesión `admin` (no superadmin) → 403.**
10. **Activación de un boleto ya en estado `vendido` → rechazada, sin sobrescribir `nombre_completo` ni `correo`.**
11. **Segunda descarga del PDF de un lote ya descargado → denegada.**
12. **Código de verificación expirado o ya usado → rechazado.**
13. **Compras concurrentes al llegar al cupo total (8,000) → no se emite el boleto 8,001.**

---

## PARTE 2 — Checklist de verificación previa a la entrega

Marca cada punto solo con evidencia (captura, prueba automatizada o salida de comando). Si no hay evidencia, está pendiente.

### Acceso a datos
- [ ] RLS o su equivalente activo en todas las tablas; ninguna tabla accesible sin política.
- [ ] Verificado desde un cliente anónimo que no se puede leer ninguna tabla directamente.
- [ ] Rol de BD de la app con privilegios mínimos.
- [ ] IDs públicos no adivinables.

### Autenticación y sesión
- [ ] Rutas protegidas responden 401/403 al accederlas por URL directa sin sesión.
- [ ] Endpoints `/admin` y `/debug` protegidos y con MFA; los de debug eliminados en producción.
- [ ] Cookies con `HttpOnly`, `Secure`, `SameSite`, expiración y rotación al autenticar.
- [ ] Contraseñas de boleto hasheadas con bcrypt cost 12 (`bcryptjs`); ninguna en claro en la BD.
- [ ] Protección CSRF activa en peticiones que cambian estado.
- [ ] **Rol leído del servidor, no del cliente; separación admin / superadmin verificada.**

### Entradas
- [ ] Todo endpoint valida con esquema en el servidor y rechaza campos desconocidos.
- [ ] Ninguna consulta SQL construida por concatenación (búsqueda en todo el repo).
- [ ] Campos sensibles (rol, precio, estado de pago, tipo, folio) no escribibles desde el cliente.

### Pagos
- [ ] Precio calculado en servidor; monto del cliente ignorado.
- [ ] Firma del webhook verificada con cuerpo crudo.
- [ ] Idempotencia probada con evento duplicado.
- [ ] Ningún dato de tarjeta almacenado ni registrado en logs.
- [ ] **Cupo total (8,000, configurable en `aforo_total_boletos`) aplicado en transacción; probado con compras concurrentes.**

### Lotes y boletos pre-generados
- [ ] **Generación de lotes restringida a superadmin; probado con sesión de admin → 403.**
- [ ] **Contraseñas en claro nunca escritas a BD, logs ni disco sin cifrar.**
- [ ] **PDF de lote servido con URL firmada de vida corta desde bucket privado.**
- [ ] **Segunda descarga del mismo lote denegada.**
- [ ] **Auditoría de lotes inmutable: ningún rol puede borrarla ni editarla.**
- [ ] **Cupo máximo por tipo aplicado en el servidor.**

### Activación de boletos
- [ ] **Activación de boleto ya `vendido` rechazada, sin sobrescribir datos.**
- [ ] **Transición de estado en transacción con bloqueo; probada con peticiones simultáneas.**
- [ ] **Rate limiting y bloqueo progresivo activos en el endpoint de activación.**

### Códigos de verificación
- [ ] **Códigos hasheados, de un solo uso y con expiración de 10 minutos.**
- [ ] **Máximo 5 intentos por código; máximo 3 solicitudes por correo por hora.**
- [ ] **El correo guardado en el boleto es el verificado en el servidor, no el del cuerpo de la petición.**
- [ ] **Purga automática de códigos expirados.**

### Límites y bots
- [ ] Rate limit con contador compartido, probado con dos instancias.
- [ ] Respuesta 429 con `Retry-After: 60`.
- [ ] Turnstile/hCaptcha validado en el servidor en compra, activación y acceso al certificado.
- [ ] Bloqueo progresivo tras intentos fallidos.

### Errores y logs
- [ ] Ningún stack trace ni mensaje de BD visible en producción.
- [ ] Mensajes no enumerables en acceso al certificado y en activación de boleto.
- [ ] Logs sin secretos, contraseñas de boleto, códigos ni datos de tarjeta; alertas configuradas.

### Secretos
- [ ] `.env*` en `.gitignore`; historial de Git limpio de secretos.
- [ ] Todas las claves que estuvieron en Git, rotadas.
- [ ] Escaneo de secretos activo en CI y pre-commit.
- [ ] Ninguna clave privada en el bundle del cliente (verificado inspeccionando el JS compilado).
- [ ] **`service_role` de Supabase y claves de Stripe/Resend/Upstash solo en variables de servidor.**

### Transporte y cabeceras
- [ ] HTTPS forzado, sin contenido mixto.
- [ ] HSTS, CSP sin `unsafe-inline`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`.
- [ ] Calificación A/A+ en SSL Labs y en securityheaders.com.
- [ ] CORS con allowlist explícita.
- [ ] SPF, DKIM y DMARC configurados en el dominio.
- [ ] **Envío de prueba a Gmail y Outlook verificado en bandeja principal, no en spam.**

### Archivos
- [ ] Carga restringida a roles con privilegio y validada por magic bytes.
- [ ] Archivos renombrados, en bucket privado, servidos con URL firmada.

### Dependencias
- [ ] Escaneo en CI sin vulnerabilidades críticas ni altas abiertas.
- [ ] Lockfile commiteado; análisis estático activo.

### Privacidad
- [ ] Aviso de Privacidad integral publicado y enlazado; simplificado en el formulario.
- [ ] Casilla de consentimiento no premarcada.
- [ ] Procedimiento ARCO documentado y correo de contacto activo.
- [ ] Retención y borrado definidos.
- [ ] **Verificado que no se recaban más datos que nombre y correo.**

### Continuidad
- [ ] Respaldos automáticos cifrados y restauración probada.
- [ ] Plan de respuesta a incidentes escrito.
- [ ] **Proyecto en Supabase plan Pro (los respaldos automáticos no existen en el plan gratuito).**

### Pruebas
- [ ] Las trece pruebas de seguridad de la sección 14 existen, se ejecutan en CI y pasan.

### Pendientes de lanzamiento (antes de anunciar la venta real)

Verificado en producción con datos y pagos de prueba (Fase 5 digital, 2026-09-04):
webhook, folio, contraseña, PDF con monto congelado, correo con adjunto,
descarga firmada y bucket privado confirmado como no listable (404 directo).
Antes de abrir la venta al público falta:

- [ ] **Limpiar datos de prueba:** borrar de `ordenes_compra` y `boletos` las
      filas generadas durante las pruebas (identificables por el correo de
      prueba usado), y borrar del bucket `boletos-digitales` los PDFs sueltos
      que le correspondan. No borrar por rango de fecha a ciegas — filtrar por
      el correo/orden de prueba específico para no tocar compras reales que
      puedan coincidir en el tiempo.
- [x] **Quitar el bloqueo de indexación** (2026-09-04): quitado el bloque
      `robots: { index: false, ... }` de `metadata` en `src/app/layout.tsx`
      y cambiado `src/app/robots.ts` de `disallow: "/"` a `allow: "/"` con
      `disallow: ["/admin", "/api", "/comprar-boleto/exito"]`. Verificado
      `NEXT_PUBLIC_SITE_URL` en producción = `https://leonesgruponegro.com.mx`;
      `sitemap.ts` ya excluía admin/api/éxito de compra sin necesitar cambios.
- [x] **Cambiar Stripe a modo live** (2026-09-04): claves live activas en
      producción, con webhook live propio y una compra digital real
      verificada de punta a punta (folio, contraseña, PDF, correo, descarga
      firmada).
- [ ] **Contratar Resend Pro:** el plan actual no cubre el volumen estimado
      (~15,000 envíos entre códigos, boletos y certificados); actualizar antes
      de que el volumen real empiece a fallar por límite de envíos.
- [ ] **Protección CSRF en las rutas anteriores a Fase 6a** (anotado
      2026-09-04): `crear-checkout-session`, `verificar-codigo`,
      `solicitar-codigo` y `contacto` no verifican `Origin`/`Sec-Fetch-Site`
      -- hueco preexistente descubierto al construir el login de admin, que
      sí lleva esa verificación desde el inicio (`src/lib/origin-check.ts`).
      Aplicar el mismo helper a las rutas viejas en un cambio aparte.