-- Datos para probar el dashboard en local (pnpm db:ejemplo). No se usan en producción

insert into proveedores (nombre, contacto, telefono, correo, direccion) values
  ('Laboratorios Holland', 'Patricia Morales', '777 312 4410', 'ventas@holland.mx', 'Av. Morelos Sur 120, Cuernavaca'),
  ('Distribuidora Vetmex', 'Ricardo Salgado', '55 5523 9087', 'pedidos@vetmex.mx', 'Calz. de Tlalpan 3402, CDMX'),
  ('Zoetis México', 'Gabriela Ortiz', '55 5081 7700', 'atencion@zoetis.mx', 'Paseo de la Reforma 505, CDMX'),
  ('Suministros Médicos del Sur', 'Hugo Benítez', '777 318 2295', 'contacto@smsur.mx', 'Blvd. Juárez 88, Cuernavaca')
on conflict (nombre) do nothing;

insert into inventario (nombre, categoria, unidad, cantidad, stock_minimo, precio, caducidad, proveedor_id)
select p.nombre_producto, p.categoria, p.unidad, p.cantidad, p.stock_minimo, p.precio, p.caducidad::date,
  (select id from proveedores where nombre = p.proveedor)
from (values
  ('Vacuna séxtuple canina', 'vacuna', 'frasco', 24, 10, 285.00, '2027-03-31', 'Zoetis México'),
  ('Vacuna antirrábica', 'vacuna', 'frasco', 6, 12, 120.00, '2027-01-15', 'Zoetis México'),
  ('Vacuna triple felina', 'vacuna', 'frasco', 14, 8, 310.00, '2026-12-20', 'Zoetis México'),
  ('Amoxicilina 250 mg', 'medicamento', 'caja', 18, 6, 145.50, '2027-06-30', 'Laboratorios Holland'),
  ('Meloxicam 1.5 mg/ml', 'medicamento', 'frasco', 3, 5, 210.00, '2027-02-28', 'Laboratorios Holland'),
  ('Ivermectina 1%', 'medicamento', 'frasco', 9, 4, 189.00, '2027-09-30', 'Distribuidora Vetmex'),
  ('Jeringas 3 ml', 'material', 'caja', 40, 15, 95.00, null, 'Suministros Médicos del Sur'),
  ('Gasas estériles', 'material', 'paquete', 12, 20, 60.00, null, 'Suministros Médicos del Sur'),
  ('Guantes de nitrilo', 'material', 'caja', 25, 10, 130.00, null, 'Suministros Médicos del Sur'),
  ('Alimento renal felino 2 kg', 'alimento', 'bolsa', 7, 4, 640.00, '2027-04-10', 'Distribuidora Vetmex'),
  ('Shampoo clorhexidina', 'higiene', 'frasco', 2, 6, 175.00, '2028-01-01', 'Distribuidora Vetmex')
) as p (nombre_producto, categoria, unidad, cantidad, stock_minimo, precio, caducidad, proveedor)
where not exists (select 1 from inventario);
