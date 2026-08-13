-- BLOCO 1: Adiciona as 2 colunas que faltam.
-- Roda SO este bloco primeiro.

alter table public.dominios_golpe
    add column if not exists criado_em timestamptz not null default now();

alter table public.dominios_golpe
    add column if not exists atualizado_em timestamptz not null default now();