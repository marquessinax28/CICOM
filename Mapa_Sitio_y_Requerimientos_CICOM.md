# Mapa del Sitio Actual y Levantamiento de Requerimientos
## CICOM — leonesporlasalud.com.mx (edición XXXIII)

---

## 1. Estructura de navegación (sitemap)

### Menú principal
```
Inicio
Congreso ▾
  ├─ Comité Organizador
  ├─ Mensaje de Bienvenida
  └─ Profesora Homenajeada
Programas ▾
  ├─ Programa Académico General   (descarga PDF — cronograma completo)
  ├─ Módulos                      (39 módulos, cada uno = 1 PDF)
  └─ Cursos Talleres              (tarjetas, misma lógica de descarga)
Concursos ▾
  ├─ Reto del León                (página propia /reto + descarga de contrato)
  ├─ Fotografías en Salud
  └─ Trabajos Libres de Cartel
Sedes                             (galería de 4 ubicaciones)
Compra en línea                   (sistema externo de boletos)
Inscripción [botón]               (sistema externo, otro subdominio)
```

### Rutas identificadas
| Ruta | Contenido |
|---|---|
| `/` | Home |
| `/reto` | Detalle Reto del León + descarga de contrato/compromiso |
| `/contacto` | Formulario de contacto |
| `/inscribirse/public/index.html` | Sistema de compra de boletos (subsistema aparte) |
| `registro.cicomhcg.com/login-acceso` | Sistema de registro/acceso (**subdominio distinto**, aparenta ser otra aplicación completamente separada del sitio principal) |

### Footer
Inicio · Sede · Contacto · Compra en línea · Inscripción + dirección del evento.

---

## 2. Página de inicio — secciones en orden

1. **Hero** — título de la edición (ej. "XXXIII Ciclo de Conferencias Médicas"), nombre del director/a, fechas del evento, estado del congreso (ej. "Ha terminado el congreso"), frase lema del año.
2. **Profesora/Profesor Homenajeado(a)** — foto, biografía corta, botón "Ver más...".
3. **Mensaje de bienvenida** — foto de quien preside, biografía/mensaje corto, botón "Ver más...".
4. **Módulos** — carrusel/grid de tarjetas con ícono + nombre (39 en total, paginado con puntos).
5. **Concursos** — 3 tarjetas (Reto del León, Fotografías en Salud, Trabajos Libres de Cartel), cada una con ilustración, tags (ej. "Medicina", "Estudiantes"), descripción corta y botón que lleva al detalle.
6. **Cursos Talleres** — carrusel de tarjetas similar a módulos, cada una con ícono, nombre y misma lógica de descarga/detalle.
7. **Sedes** — carrusel de imágenes (4 sedes), cada una con nombre y dirección.
8. **Footer**.

---

## 3. Funcionalidad detallada por sección

### 3.1 Módulos (39 en total)
- Cada tarjeta, al hacer clic: **en desktop abre el PDF en pestaña nueva**; **en móvil se descarga automáticamente**.
- No hay filtro ni buscador — es una lista/carrusel plano.
- **Implicación para el nuevo sitio:** con 39 ítems, esto es candidato directo para la mejora de "buscador/filtro" que ya identificamos — filtrar por especialidad haría mucho más usable esta sección.

### 3.2 Concursos
- 3 concursos con página o sección de detalle propia.
- Cada uno tiene un botón que **despliega y descarga un documento tipo contrato/carta compromiso** (visto en detalle en "Reto del León": campos para nombre del equipo, capitán, integrantes, y firma — es un PDF que se llena a mano y se debe subir o entregar después, no hay firma digital ni formulario web).
- **Implicación:** esto es un candidato fuerte para digitalizar — un formulario web con firma electrónica o al menos captura de datos en base de datos, en vez de un PDF que se llena a mano.

### 3.3 Cursos y Talleres
- Misma lógica que concursos: tarjetas con descarga/detalle.

### 3.4 Sedes
- Galería de 4 ubicaciones con foto, nombre y dirección (ej. "Antiguo Hospital Civil", Calle Hospital 278, Centro Barranquitas).
- Estático — sin mapa interactivo ni geolocalización.

### 3.5 Contacto
- Formulario simple: Nombre completo, Correo electrónico, Mensaje, botón Enviar.
- **Pendiente de confirmar con el doctor:** ¿a dónde llegan estos mensajes? (correo directo, base de datos, o no hay backend real todavía).

### 3.6 Programa Académico General
- Botón en el menú "Programas" que descarga **un PDF grande** con el cronograma completo de módulos, talleres y concursos.
- **Implicación:** esta es la version "documento" de lo que el nuevo sitio podría mostrar como una agenda navegable dentro del sitio (con filtro por día/módulo), dejando el PDF como opción de descarga adicional, no como única fuente.

### 3.7 Sistema de Registro / Compra de boletos — hallazgo importante
Estos **no viven dentro del sitio principal**:
- `registro.cicomhcg.com` — subdominio y aplicación aparte, con su propio login.
- `/inscribirse/public/index.html` — otra ruta que parece un sistema de ticketing embebido, distinto del anterior.

Ambos, al estar cerrados, muestran mensajes de "ya no disponible" en vez de redirigir de forma elegante al sitio principal.

**Esto es clave para tu llamada con el doctor** — necesitas preguntar:
1. ¿`registro.cicomhcg.com` y `/inscribirse` son el mismo sistema o dos distintos?
2. ¿Quién los administra hoy — un proveedor externo, o el mismo equipo?
3. ¿Se integran en el nuevo proyecto, o el nuevo sitio los reemplaza por completo?

Esta pregunta puede cambiar bastante el alcance (y el presupuesto) del proyecto, así que vale la pena resolverla antes de dar cualquier número.

---

## 4. Arquitectura del nuevo sitio

### Diseño de tablas (esquema final, PostgreSQL)

**`ordenes_compra`** — el pago, una sola vez por compra
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre_comprador | text | |
| correo_comprador | text | |
| monto_total | numeric | |
| stripe_payment_intent_id | text | referencia al pago real en Stripe — la fuente de verdad |
| estado | text | pendiente / pagado / fallido / reembolsado |
| cantidad_boletos | int | |
| fecha_compra | timestamp | |

**`boletos`** — cada asistente individual
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| orden_id | FK → ordenes_compra.id, nullable | null en boletos pre-generados (físicos, becas, colchón) |
| lote_id | FK → lotes_boletos.id, nullable | null en boletos digitales |
| tipo | text | fisico / beca_residente / colchon / digital |
| estado | text | disponible / vendido |
| folio | text, unique | código aleatorio de 12 caracteres, **no secuencial** — ver nota de diseño en CLAUDE.md sección 2 sobre la desviación de ≥128 bits |
| password_hash | text | hasheada, nunca texto plano |
| nombre_completo | text, nullable | se llena al comprar (digital) o al activar (pre-generado) |
| correo | text, nullable | igual que arriba |
| intentos_fallidos | int, default 0 | para bloquear fuerza bruta |
| certificado_descargado | boolean, default false | opcional, para llevar control |
| fecha_generado | timestamp | |
| fecha_activacion | timestamp, nullable | cuándo se completaron los datos |

**`lotes_boletos`** — cada generación de boletos sin pago
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| tipo | text | fisico / beca_residente / colchon |
| cantidad | int | |
| generado_por | FK → administradores.id | auditoría: quién lo generó |
| fecha_generacion | timestamp | |
| archivo_descargado | boolean, default false | el PDF de boletos se entrega una sola vez |

**`cupos_boleto`** — tope configurable por tipo de boleto
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| tipo | text, unique | fisico / beca_residente / colchon / digital |
| cupo_maximo | int | modificable solo por superadmin; la suma de los cuatro tipos no puede exceder 6,000 |
| modificado_por | FK → administradores.id | auditoría |
| fecha_modificacion | timestamp | |

**`codigos_verificacion`** — para confirmar el correo antes de dejar comprar
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| correo | text | |
| codigo_hash | text | hasheado, igual que cualquier credencial |
| intentos_fallidos | int, default 0 | máx. 5, luego se invalida el código |
| expira_en | timestamp | ej. 10 minutos después de creado |
| verificado | boolean, default false | |
| fecha_creacion | timestamp | |

**`administradores`** — separada por completo del flujo público, para el panel de administración
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| correo | text, unique | |
| password_hash | text | |
| nombre | text | |
| rol | text | superadmin / admin — solo superadmin modifica cupos de boletos sin pago |

**`modulos`**
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | text | |
| descripcion | text | |
| especialidad | text | para el futuro filtro/buscador |
| archivo_pdf_url | text | |
| orden | int | orden de despliegue en el sitio |

**`inscripciones_modulo`** — tabla intermedia N:M entre boletos y módulos
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| boleto_id | FK → boletos.id | |
| modulo_id | FK → modulos.id | |
| fecha_inscripcion | timestamp | |

**`concursos`**
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | text | |
| descripcion | text | |
| categoria_tags | text[] | ej. "Medicina", "Estudiantes" |
| archivo_bases_pdf | text | |
| fecha_limite | date | |

**`inscripciones_concurso`**
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| concurso_id | FK → concursos.id | |
| nombre_equipo | text | |
| capitan_nombre | text | capturado directo en el formulario, sin depender de cuentas |
| capitan_correo | text | |
| fecha_inscripcion | timestamp | |

**`cursos_talleres`**
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | text | |
| descripcion | text | |
| archivo_url | text | |

**`sedes`**
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | text | |
| direccion | text | |
| imagen_url | text | |
| coordenadas | point | opcional, para mapa interactivo |

**`comite_organizador`**
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | text | |
| cargo | text | tesorero, coordinador, etc. |
| foto_url | text | |
| bio | text | |

**`certificados`**
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| boleto_id | FK → boletos.id, unique | 1 certificado por boleto |
| tipo | text | asistente / ponente / ganador de concurso |
| horas | numeric | si aplica |
| fecha_emision | timestamp | se genera al cierre del congreso |

**`patrocinadores`**
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | text | |
| logo_url | text | |
| link_externo | text | |
| nivel | text | oro / plata / bronce, si aplica |

**`mensajes_contacto`**
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | text | |
| correo | text | |
| mensaje | text | |
| atendido | boolean, default false | |
| fecha | timestamp | |

### Decisiones de arquitectura ya confirmadas
- Todo se construye desde cero, conectado a base de datos propia (nada de sistemas externos como el `registro.cicomhcg.com` anterior).
- Pasarela de pago: **Stripe** (sin facturación/CFDI).
- Sin código QR — el control de acceso al certificado es por **folio + contraseña hasheada**, capturados directo en el boleto.
- **Sin sección de registro/cuentas.** Los datos del asistente (nombre, correo) se capturan al momento de la compra, directo en la tabla `boletos`. El acceso al certificado se valida en un solo paso: correo + contraseña del boleto, sin crear una cuenta intermedia.
- **Generación del boleto:** el folio y la contraseña **no se pre-generan** — se crean justo cuando el webhook confirma el pago. La contraseña en texto plano se usa una sola vez, en ese instante, para dibujarse sobre la plantilla del boleto (misma técnica de superposición que el certificado); después solo se guarda su versión hasheada. El boleto se manda por correo y se descarga al mismo tiempo.
- **Control del cupo máximo (6,000 boletos):** se valida contando los registros existentes en `boletos` dentro de la misma transacción de compra — no se usa un pool pre-generado de códigos "disponibles" para los digitales.
- **Cuatro tipos de boleto:** físicos (cupo inicial 2,500), becas de residentes (cupo inicial 1,500), colchón (cupo inicial 500) y digitales (cupo inicial 1,500), cada uno con su tope en `cupos_boleto.cupo_maximo`. Los primeros tres se **pre-generan por lotes** desde el panel de administración (sin pasar por pago); los digitales se generan al confirmarse el pago.
- **Tope configurable por tipo (`cupos_boleto`):** el superadmin puede mover cupo entre tipos sin tocar código (ej. bajar `colchon` y subir `fisico`). **La suma de `cupo_maximo` de los cuatro tipos no puede exceder 6,000, y esa restricción se valida en el servidor** — en la misma transacción que aplica el cambio, no en el cliente. Un intento de guardar cupos cuya suma rebase 6,000 se rechaza antes de escribir en la base de datos.
- **Generación de lotes sin pago:** al generar un lote, el sistema entrega **una sola vez** un PDF con los boletos ya diseñados — misma técnica de superposición que el certificado (plantilla + folio y contraseña dibujados encima), un boleto por página. En la base de datos solo queda el hash de la contraseña. Cada lote queda registrado en auditoría inmutable (qué admin, cuándo, cuántos, de qué tipo).
- **Entrega de los tres tipos sin pago:** los tres (físicos, becas, colchón) se descargan como PDF y **el admin los reparte manualmente**. La diferencia es solo el formato de salida: los físicos van a imprenta, las becas y el colchón se distribuyen digitalmente (correo manual, mensajería, etc.). El sistema no registra a quién se le entregó cada uno — esos datos se capturan cuando la persona activa su boleto.
- **Rol de superadmin:** solo el superadmin (Cristian) puede modificar los cupos permitidos de boletos generables sin pago. Los admins normales no pueden alterar esos límites.
- **Sección "Activar boleto"** (reemplaza la sección de registro del sitio anterior): quien recibió un boleto físico, de beca o de colchón entra con su folio + contraseña y captura su nombre y correo, para poder recibir su certificado al final.
  - La activación **no crea un registro nuevo** — solo completa el boleto que ya existe, por lo que no puede haber doble registro.
  - **Regla de backend:** la activación solo procede si el boleto está en estado `disponible`. Un boleto ya `vendido` (comprado en línea o ya activado) devuelve un mensaje de "este boleto ya está activo" y no permite sobrescribir los datos. Esto evita que alguien con el folio de otra persona se apropie de su certificado.
  - Se muestra una advertencia previa aclarando que la sección es solo para boletos físicos, becas y cortesías — pero la advertencia es cortesía, la protección real es la validación de estado en el backend.
- **Verificación de correo antes de comprar:** el flujo de compra pide el correo, manda un código de 6 dígitos, y solo desbloquea el formulario de compra una vez verificado (correo precargado y bloqueado en ese punto). Si la persona se equivoca al escribir el correo, simplemente nunca recibe el código — da refresh y vuelve a intentar con el correo correcto. Esto reemplaza la necesidad de validar el correo por otros medios (MX, doble campo, servicios de pago).
- El panel de administración usa credenciales completamente separadas (tabla `administradores`), sin relación con los datos de los asistentes.
- Un boleto = un asistente = un certificado. Las compras de varios boletos generan varios registros independientes en `boletos`, cada uno con sus propios datos y su propio folio+contraseña.
- Pendiente de resolver con el doctor: validación de entrada física al evento (folio revisado manualmente vs. sin control físico), y si el certificado debe bloquearse hasta el cierre del congreso.

### Páginas/rutas del nuevo sitio
- `/` — home
- `/programas` — módulos + cursos/talleres con buscador y filtro
- `/concursos` — listado + `/concursos/[slug]` detalle con formulario real (no PDF)
- `/sedes` — galería + mapa
- `/contacto` — formulario conectado a base de datos
- `/comprar` — verificación de correo por código → checkout de Stripe → boleto
- `/activar` — activación de boletos físicos, becas y colchón
- `/certificado` — acceso con correo + contraseña de boleto
- `/historico` — resumen de congresos anteriores
- `/admin` — panel de administración (protegido)
- `/admin/superadmin` — generación de lotes, cupos y plantilla de certificado (solo superadmin)

---

## 5. Plataformas y costos

### Plataformas del proyecto
| Plataforma | Para qué sirve | Costo | Cuenta a nombre de |
|---|---|---|---|
| GoDaddy | Dominio `leonesporlasalud.com.mx` | ~$200-450 MXN/año | Cristian (ya contratado) |
| Supabase Pro | Base de datos + almacenamiento de archivos | $25 USD/mes | Cristian → transferir al comité |
| Resend | Correo transaccional (~15,000 envíos) | ~$20 USD/mes | Cristian → transferir al comité |
| Vercel | Hosting y despliegue automático | $0 (plan gratuito) | Cristian, conectada a GitHub |
| GitHub | Repositorio del código | $0 | Cristian |
| Stripe | Pagos | $0 fijo + 3.6% + $3 MXN por venta | **Hospital/comité** (datos fiscales de ellos) |
| Upstash Redis | Contador de rate limiting compartido | $0 (plan gratuito) | Cristian |
| Cloudflare Turnstile | Protección anti-bot | $0 | Cristian |

**Total operativo: ~$45 USD/mes** (~$830 MXN), más el dominio anual. La comisión de Stripe se descuenta de cada venta, no se paga de bolsillo, y solo aplica a los ~1,500 boletos digitales.

### Notas sobre las cuentas
- **Stripe es la única urgente y la única que no depende de Cristian:** requiere razón social, RFC, régimen fiscal, domicilio fiscal, constancia de situación fiscal, acta constitutiva, CLABE y comprobante bancario del comité, más datos del representante legal (que debe capturarlos él mismo en el formulario de Stripe, no enviárselos a Cristian). La verificación tarda días.
- **Pendiente de aclarar:** si la entidad que recibe el dinero es el Hospital Civil o la sociedad de médicos residentes — son RFC distintos y arrancar con el equivocado obliga a rehacer el trámite.
- Se puede desarrollar todo el flujo de pagos en **modo prueba de Stripe** sin la verificación completa.
- Las cuentas a nombre de Cristian deben transferirse al comité o quedar con acceso compartido al momento de la entrega.
- Durante desarrollo se puede usar el plan gratuito de Supabase; cambiar a Pro **antes de salir a producción** (el plan gratuito no tiene respaldos y pausa el proyecto por inactividad).

---

## 6. Fases del proyecto

| # | Fase | Notas |
|---|---|---|
| 1 | Base de datos y arquitectura de roles | ✅ Diseñado (sección 5 de este documento) |
| 2 | Frontend completo + despliegue | Carga de imágenes y contenido real, no maquetas |
| 3 | Pagos con Stripe + webhook verificado | En modo prueba mientras llega la verificación |
| 4 | Generación de boletos (4 tipos, hasheo incluido) | Incluye lotes y PDF de impresión |
| 5 | Sección de activación de boletos | Para físicos, becas y colchón |
| 6 | Panel de admin | Boletos, concursos, talleres, mensajes de contacto |
| 7 | Panel de superadmin | Lotes, cupos, plantilla de certificado |
| 8 | Sección de certificados | Generación dinámica + envío por lotes |
| 9 | Auditoría de seguridad y pruebas | Checklist de la Parte 2 del documento de seguridad |
| 10 | Resumen de congresos anteriores | Lo único que no bloquea nada más |

**Nota sobre seguridad:** no es una fase aparte. Cada medida se implementa dentro de la fase donde nace la funcionalidad (el hasheo en la fase 4, la verificación del webhook en la 3, el rate limiting en la 5 y la 8). La fase 9 es una **auditoría** de lo ya construido, no el momento de agregar seguridad por primera vez. Ver `Prompt_de_seguridad_CICOM.md`.

**Nota sobre el envío de certificados:** el mecanismo definitivo es que el usuario los descargue desde `/certificado`. El envío por correo es una notificación de disponibilidad, no el medio principal — y se manda **por lotes con pausas**, nunca 6,000 correos de golpe, para no ser marcado como spam.

---

## 7. Pendientes abiertos con el doctor

- [ ] Tipos de precio de boleto (único, o estudiante/residente/especialista) y cómo se validaría cada categoría
- [ ] Precio final del boleto y fecha límite de inscripción (¿hay early bird?)
- [ ] Entidad fiscal que recibe el dinero (Hospital Civil vs. sociedad de médicos residentes)
- [ ] Datos fiscales, bancarios y del representante legal para verificar Stripe
- [ ] ¿Hay validación de entrada física al evento, o el control es solo para el certificado?
- [ ] ¿El certificado se bloquea hasta el cierre del congreso, o está disponible desde la compra?
- [ ] Fotos y biografías del comité organizador y del profesor homenajeado
- [ ] Logos de patrocinadores en alta resolución y sus links
- [ ] Aviso de privacidad vigente (obligatorio por LFPDPPP al capturar datos personales)
- [ ] Redes sociales oficiales para enlazar
- [ ] Confirmar que el diseño del boleto impreso **incluya la instrucción de activación** — sin eso, quienes reciban boleto físico no se enteran de que deben activarlo para recibir certificado

---

## 8. Checklist completo de requerimientos a solicitar

*Incluye lo ya recaudado por Cristian más los puntos adicionales identificados.*

### A. Información y contenido de la edición actual
- [x] Número de edición del CICOM
- [x] Fecha de inicio y fin
- [x] Nombre del profesor/a a homenajear
- [x] Nombres y cargos del comité organizador
- [x] Programa académico completo (archivo)
- [x] Nombres de talleres, módulos y concursos
- [x] Contratos/bases de los concursos
- [ ] **Fotos** del profesor/a homenajeado/a y de cada miembro del comité (los nombres solos no bastan para las tarjetas del sitio)
- [ ] **Biografías o descripciones cortas** de cada módulo, taller y concurso (el sitio anterior no las tenía completas — buen momento para pedirlas)
- [ ] Texto del **mensaje de bienvenida** (¿lo da el mismo director o alguien más?)
- [ ] Nombres, direcciones y fotos de las **sedes** (identifiqué 4 en el sitio anterior)
- [ ] Logo oficial de esta edición (archivo vectorial, no solo la imagen del sitio viejo)

### B. Patrocinadores y marca
- [x] Nombres de patrocinadores y sus links (ya lo tienes)
- [ ] **Logos de cada patrocinador** en alta resolución (archivo, no captura de pantalla)
- [ ] ¿Existen niveles de patrocinio (oro/plata/bronce) que deban mostrarse con jerarquía visual distinta?

### C. Inscripciones y boletos — la parte más crítica
- [x] Confirmar si el total de 6,000 boletos aplica sin importar el canal
- [x] Costo del boleto
- [ ] **¿El precio es único o hay categorías?** (estudiante, residente, especialista, etc. — el sitio anterior no mostraba esto claro)
- [ ] **Métodos de pago a aceptar** (tarjeta, OXXO, transferencia) — define qué pasarela de pago usar
- [ ] **¿Requieren facturación (CFDI)?** — esto cambia bastante el desarrollo del checkout
- [ ] **Política de cancelación/reembolso**, si existe
- [ ] **Fecha límite de inscripción** (¿hay precio "early bird"?)
- [ ] **Qué datos exactos debe capturar el formulario** (nombre, correo, teléfono, institución, especialidad, ¿alergias para los talleres prácticos?)
- [x] Confirmar si **el sistema de inscripción actual (`registro.cicomhcg.com`) y el de boletos (`/inscribirse`) se reemplazan por completo o se integran** — **Decisión confirmada: todo se construye desde cero**, inscripción y compra en línea incluidas, conectado a su propia base de datos

### D. Certificados y constancias
- [ ] ¿Se van a emitir constancias digitales? ¿Con qué información (nombre, horas, firma del director)?
- [ ] ¿Hay constancias distintas por tipo de participación (asistente, ponente, ganador de concurso)?

### E. Accesos y credenciales técnicas
- [x] Confirmar acceso al correo `33cicom@gmail.com`
- [x] **¿Quién es dueño del dominio `leonesporlasalud.com.mx`?** Dominio comprado por Cristian en GoDaddy, ya tiene las credenciales
- [ ] **Fecha de vencimiento del dominio actual** (revisar en el panel de GoDaddy y poner recordatorio de renovación)
- [ ] **Acceso al hosting/servidor actual**, si necesitas rescatar algo (backups, contenido histórico)
- [x] Cuántas personas tendrán acceso de administrador (tu recomendación de "entre menos, mejor" es la correcta)

### F. Legal y privacidad
- [ ] ¿Existe un **aviso de privacidad** vigente? Si van a capturar datos personales para inscripción, es obligatorio por la ley mexicana (LFPDPPP)
- [ ] ¿Términos y condiciones para la compra de boletos?
- [ ] ¿Tienen permiso de uso de imagen de las fotos que usan (comité, ponentes, sedes)?

### G. Redes sociales y contacto
- [ ] Redes sociales oficiales del CICOM (Instagram, Facebook, etc.) para enlazar en el sitio
- [ ] Confirmar a dónde deben llegar los mensajes del formulario de contacto (¿al correo de Gmail, a alguien en particular?)
