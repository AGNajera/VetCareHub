-- Clientes y sus citas. Los clientes son cuentas de Better Auth (tabla "user") con el rol
-- cliente; las crea el personal desde /dashboard/clientes

alter table "user"
  add column if not exists telefono text;

create table citas (
  id uuid primary key default gen_random_uuid(),
  -- Si se borra la cuenta del cliente se van sus citas
  cliente_id text not null references "user" (id) on delete cascade,
  mascota text not null,
  especie text not null
    check (especie in ('perro', 'gato', 'ave', 'roedor', 'reptil', 'otro')),
  -- Fecha y hora de la clínica (Ciudad de México), sin zona horaria
  fecha date not null,
  -- Cada 30 minutos de 9:00 a 15:30, para terminar a las 16:00 (src/lib/citas.ts)
  hora time not null
    check (
      hora between '09:00' and '15:30'
      and extract(minute from hora) in (0, 30)
      and extract(second from hora) = 0
    ),
  servicio text not null
    check (servicio in ('consulta', 'vacunacion', 'desparasitacion', 'cirugia', 'laboratorio', 'estetica')),
  motivo text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmada', 'completada', 'cancelada')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- No puede haber dos citas a la misma hora. Las canceladas no cuentan: su horario se libera
create unique index citas_horario_unico on citas (fecha, hora) where estado <> 'cancelada';
create index citas_cliente_idx on citas (cliente_id);
