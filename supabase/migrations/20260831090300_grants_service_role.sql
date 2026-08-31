-- Bug real encontrado al probar de verdad con la clave service_role (no con
-- el editor SQL del dashboard, que corre como el superusuario `postgres` y
-- por eso nunca mostró el problema): las migraciones anteriores hicieron
-- REVOKE de anon/authenticated pero nunca GRANT explícito a service_role.
-- RLS y los privilegios de tabla son capas independientes en Postgres --
-- service_role omite RLS, pero sin GRANT de tabla no puede ni leer.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Para que las tablas que se agreguen en fases futuras no repitan este bug.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
