-- Cupos iniciales por tipo (BRIEF.md, sección "Modelo de datos"). Suman exactamente
-- 6000, así que el trigger de suma máxima (migración *_triggers_integridad.sql)
-- los acepta sin necesidad de una excepción especial para el primer arranque.
insert into public.cupos_boleto (tipo, cupo_maximo) values
  ('fisico', 2500),
  ('beca_residente', 1500),
  ('colchon', 500),
  ('digital', 1500);
