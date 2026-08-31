-- Hueco descubierto al escribir el script de siembra: modulos y concursos
-- solo tenían columna para el documento (PDF), no para el ícono/logo que
-- el sitio de referencia sí mostraba por tarjeta. Columnas nullable,
-- aditivas, sin tocar nada existente.
alter table public.modulos add column icono_url text;
alter table public.concursos add column icono_url text;
alter table public.cursos_talleres add column icono_url text;
