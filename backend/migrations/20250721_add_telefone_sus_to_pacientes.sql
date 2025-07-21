-- MIGRATION: Adiciona telefone e sus à tabela pacientes
ALTER TABLE "pacientes" ADD COLUMN "telefone" character varying(20);
ALTER TABLE "pacientes" ADD COLUMN "sus" character varying(20);
