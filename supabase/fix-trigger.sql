-- ============================================================================
-- Corrige a trigger orfa e alinha a tabela ao schema real atual.
-- A tabela dominios_golpe ja existe mas sem as colunas criado_em / atualizado_em.
-- ============================================================================

-- 1. Remove a trigger quebrada
drop trigger if exists trg_dominios_golpe_updated_em on public.dominios_golpe;

-- 2. Remove a funcao orfa (recreate abaixo so se a coluna existir)
drop function if exists public.tg_touch_updated_em();
drop function if exists private.tg_touch_updated_em();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

-- 3. Adiciona as colunas que faltam (idempotente)
alter table public.dominios_golpe
    add column if not exists criado_em timestamptz not null default now();

alter table public.dominios_golpe
    add column if not exists atualizado_em timestamptz not null default now();

-- 4. Recria a funcao
create or replace function private.tg_touch_updated_em()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
    new.atualizado_em := pg_catalog.now();
    return new;
end;
$function$;

revoke all on function private.tg_touch_updated_em()
    from public, anon, authenticated, service_role;

-- 5. Recria a trigger
create trigger trg_dominios_golpe_updated_em
    before update on public.dominios_golpe
    for each row execute function private.tg_touch_updated_em();

-- 6. Ativa 2 dominios da seed
update public.dominios_golpe
set confirmado = true
where dominio in ('bradesco-seguranca.com.br', 'nubank-suporte.net');

-- 7. Checagem final
select dominio, categoria, confirmado, criado_em, atualizado_em
from public.dominios_golpe
order by confirmado desc, dominio;

-- 8. Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
