-- Agrega la tabla de mascotas y vincula cada cita a una mascota en lugar de guardar
-- nombre y especie directo en citas. Conserva las citas que ya existan creando sus mascotas

create table mascotas (
  id uuid primary key default gen_random_uuid(),
  -- Si se borra la cuenta del cliente se van sus mascotas (y con ellas sus citas)
  cliente_id text not null references "user" (id) on delete cascade,
  nombre text not null,
  especie text not null
    check (especie in ('perro', 'gato', 'ave', 'roedor', 'reptil', 'otro')),
  raza text,
  nacimiento date,
  -- Alergias, carácter, lo que convenga saber antes de atenderla
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index mascotas_cliente_idx on mascotas (cliente_id);

alter table citas
  add column mascota_id uuid references mascotas (id) on delete cascade;

-- Si ya había citas registradas antes de esta migración, crea una mascota por cada
-- combinación (cliente, nombre, especie) y enlaza sus citas
insert into mascotas (cliente_id, nombre, especie)
select distinct cliente_id, mascota, especie from citas;

update citas c
set mascota_id = (
  select m.id
  from mascotas m
  where m.cliente_id = c.cliente_id
    and m.nombre = c.mascota
    and m.especie = c.especie
  limit 1
);

alter table citas
  alter column mascota_id set not null,
  drop column cliente_id,
  drop column mascota,
  drop column especie;

drop index if exists citas_cliente_idx;
create index citas_mascota_idx on citas (mascota_id);
