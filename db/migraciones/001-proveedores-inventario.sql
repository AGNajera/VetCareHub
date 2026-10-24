-- Proveedores e inventario de la clínica. Las tablas de cuentas y sesiones (user, session,
-- account...) son de Better Auth y las crea su CLI, no estos archivos

create table proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  -- Persona con la que se trata: el representante del laboratorio o del distribuidor
  contacto text,
  telefono text,
  correo text,
  direccion text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table inventario (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null
    check (categoria in ('medicamento', 'vacuna', 'material', 'alimento', 'higiene')),
  -- Cómo se cuenta: pieza, caja, frasco, bolsa...
  unidad text not null default 'pieza',
  cantidad integer not null default 0 check (cantidad >= 0),
  -- Con esta cantidad o menos el producto sale como "por agotarse"
  stock_minimo integer not null default 0 check (stock_minimo >= 0),
  precio numeric(10, 2) not null default 0 check (precio >= 0),
  -- Solo para lo que caduca (medicamentos, vacunas, alimento)
  caducidad date,
  -- Si se borra el proveedor el producto se queda, sin proveedor
  proveedor_id uuid references proveedores (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index inventario_proveedor_idx on inventario (proveedor_id);
