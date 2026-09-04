-- Buckets privados para Fase 5 (generación de boletos digitales): la
-- plantilla del boleto y los PDFs ya generados NUNCA deben ser de lectura
-- pública -- a diferencia de contenido-publico, un boleto lleva folio +
-- contraseña en claro. Si algo aquí quedara con lectura pública, cualquiera
-- con la URL podría listar/descargar boletos ajenos.
--
-- public=false hace que storage.objects pase TAMBIÉN las lecturas por RLS
-- (no solo las escrituras, a diferencia del bucket público de
-- contenido-publico). Como no se agrega ninguna política de
-- SELECT/INSERT/UPDATE/DELETE para anon/authenticated, todo queda
-- denegado por defecto -- fail closed (CLAUDE.md sección 1). Únicamente
-- service_role (que omite RLS) lee/escribe directo, desde el servidor.
--
-- El comprador nunca recibe una ruta directa al bucket: descarga su
-- boleto vía URL firmada de vida corta (createSignedUrl, minutos, no
-- horas) generada por el servidor en el momento de la descarga -- mismo
-- patrón que CLAUDE.md sección 5-bis exige para los PDFs de lote.
insert into storage.buckets (id, name, public)
values
  ('plantillas-boleto', 'plantillas-boleto', false),
  ('boletos-digitales', 'boletos-digitales', false)
on conflict (id) do nothing;
