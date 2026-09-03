-- ⚠️ PRECIO PROVISIONAL -- el comité aún no confirma el precio final del
-- boleto ni si habrá categorías (BRIEF.md sección "Pendientes"). Esta fila
-- existe solo para poder probar el flujo de compra de punta a punta en modo
-- prueba de Stripe. Antes de salir a producción: actualizar precio_centavos
-- (o agregar más filas de categoría) desde el panel de administración /
-- SQL directo -- nunca cambiar el precio en código.
insert into public.precios_boleto (categoria, precio_centavos, activo) values
  ('general', 50000, true); -- $500.00 MXN, placeholder
