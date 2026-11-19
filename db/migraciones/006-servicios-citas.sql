-- Amplía el catálogo de servicios de las citas a 20 opciones (src/lib/citas.ts)

alter table citas
  drop constraint if exists citas_servicio_check,
  add constraint citas_servicio_check check (
    servicio in (
      'consulta',
      'consulta_especialidad',
      'urgencias',
      'vacunacion',
      'desparasitacion',
      'esterilizacion',
      'cirugia',
      'limpieza_dental',
      'laboratorio',
      'rayos_x',
      'ultrasonido',
      'electrocardiograma',
      'citologia',
      'curaciones',
      'fluidoterapia',
      'hospitalizacion',
      'estetica',
      'bano_medicado',
      'microchip',
      'certificado_viaje'
    )
  );
