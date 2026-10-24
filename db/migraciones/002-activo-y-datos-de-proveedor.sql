-- Los productos ya no se borran: se deshabilitan y se pueden volver a habilitar.
-- Los proveedores guardan sus datos fiscales y de ubicación

alter table inventario
  add column activo boolean not null default true;

alter table proveedores
  add column razon_social text,
  add column rfc text check (rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
  add column ciudad text,
  add column estado text,
  add column codigo_postal text check (codigo_postal ~ '^[0-9]{5}$'),
  -- Días que da el proveedor para pagar; 0 es de contado
  add column dias_credito integer not null default 0 check (dias_credito >= 0),
  add column sitio_web text;
