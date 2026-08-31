-- Bucket público para imágenes de contenido no sensible (módulos, concursos,
-- comité, ediciones/homenajeado). Nada relacionado con boletos o certificados
-- va aquí -- esos son privados y se sirven con URL firmada (CLAUDE.md sección
-- 10), no desde este bucket.
insert into storage.buckets (id, name, public)
values ('contenido-publico', 'contenido-publico', true)
on conflict (id) do nothing;

-- `public = true` sirve los objetos vía /storage/v1/object/public/... sin
-- pasar por RLS de storage.objects, así que las lecturas públicas ya
-- funcionan con eso. storage.objects tiene RLS activo por defecto en
-- Supabase y sin políticas de INSERT/UPDATE/DELETE para anon/authenticated,
-- así que las escrituras ya quedan denegadas por defecto -- igual que en
-- el resto del esquema. Solo el servidor (service_role, que omite RLS) sube
-- archivos, vía el script de siembra o, más adelante, el panel de admin.
