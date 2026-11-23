-- Amplía el horario de atención de la clínica hasta las 19:00 (última cita a las 18:30)
-- para que coincida con el cierre diario y el cron job de cancelación automática a las 19:00

alter table citas
  drop constraint if exists citas_hora_check,
  add constraint citas_hora_check check (
    hora between '09:00' and '18:30'
    and extract(minute from hora) in (0, 30)
    and extract(second from hora) = 0
  );
