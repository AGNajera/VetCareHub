-- Fecha en que el cliente aceptó los términos y condiciones al entrar por primera vez

alter table "user"
  add column if not exists terminos_aceptados_en timestamptz;
