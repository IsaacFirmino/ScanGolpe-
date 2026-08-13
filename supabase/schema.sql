-- =============================================================================
-- ScanGolpe — schema completo para o projeto Supabase
-- Projeto: ujdybixqxkbylbjcjjfk (https://supabase.com/dashboard/project/ujdybixqxkbylbjcjjfk)
--
-- Como aplicar:
--   1. Abra o painel do Supabase -> SQL Editor
--   2. Clique em "New query"
--   3. Cole este arquivo inteiro
--   4. Clique em "Run" (Ctrl + Enter)
--
-- Este script é idempotente: pode ser rodado mais de uma vez sem erro.
-- Ele cria (ou recria) as tabelas, habilita RLS e instala as policies
-- necessárias para o app funcionar corretamente.
-- =============================================================================


-- =============================================================================
-- 0. Extensões
-- =============================================================================
create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;
alter default privileges in schema private
    revoke execute on functions from public, anon, authenticated, service_role;


-- =============================================================================
-- 1. Tabela: dominios_golpe
--    Base colaborativa de domínios confirmados como fraudulentos.
--    O app consulta apenas linhas com confirmado = true.
-- =============================================================================
create table if not exists public.dominios_golpe (
    id          uuid        primary key default gen_random_uuid(),
    dominio     text        not null unique,
    categoria   text        not null default 'phishing',
    confirmado  boolean     not null default false,
    criado_em   timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create index if not exists idx_dominios_golpe_confirmado
    on public.dominios_golpe (confirmado);

create index if not exists idx_dominios_golpe_dominio
    on public.dominios_golpe (lower(dominio));

-- Mantém atualizado_em consistente
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

drop trigger if exists trg_dominios_golpe_updated_em on public.dominios_golpe;
create trigger trg_dominios_golpe_updated_em
    before update on public.dominios_golpe
    for each row execute function private.tg_touch_updated_em();

-- Rede de segurança: novas tabelas públicas nascem com RLS habilitado.
create or replace function private.rls_auto_enable()
returns event_trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
    cmd record;
begin
    for cmd in
        select *
        from pg_catalog.pg_event_trigger_ddl_commands()
        where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
          and object_type in ('table', 'partitioned table')
    loop
        if cmd.schema_name = 'public' then
            execute pg_catalog.format(
                'alter table if exists %s enable row level security',
                cmd.object_identity
            );

            raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
        end if;
    end loop;
end;
$function$;

revoke all on function private.rls_auto_enable()
    from public, anon, authenticated, service_role;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
    on ddl_command_end
    execute function private.rls_auto_enable();


-- =============================================================================
-- 2. Tabela: relatos_golpe
--    Denúncias enviadas pelo botão "Denunciar este golpe" no resultado.
--    Inserção é pública (anon); leitura fica restrita a autenticados.
-- =============================================================================
create table if not exists public.relatos_golpe (
    id          uuid        primary key default gen_random_uuid(),
    tipo        text        not null check (tipo in ('mensagem','link','pix','anuncio','outro')),
    conteudo    text        not null,
    dominio     text,
    risco       text        not null check (risco in ('low','medium','high','critical')),
    confianca   integer     not null check (confianca between 0 and 100),
    criado_em   timestamptz not null default now()
);

create index if not exists idx_relatos_golpe_criado_em
    on public.relatos_golpe (criado_em desc);

create index if not exists idx_relatos_golpe_dominio
    on public.relatos_golpe (lower(dominio))
    where dominio is not null;


-- =============================================================================
-- 3. Row Level Security
-- =============================================================================
alter table public.dominios_golpe  enable row level security;
alter table public.relatos_golpe   enable row level security;


-- =============================================================================
-- 4. Policies — dominios_golpe
--    anon pode LER apenas linhas confirmadas.
--    authenticated (admin) tem acesso total.
-- =============================================================================
drop policy if exists "anon_select_confirmados" on public.dominios_golpe;
drop policy if exists "auth_all_dominios_golpe"  on public.dominios_golpe;

create policy "anon_select_confirmados"
    on public.dominios_golpe
    for select
    to anon
    using (confirmado = true);

create policy "auth_all_dominios_golpe"
    on public.dominios_golpe
    for all
    to authenticated
    using (true)
    with check (true);


-- =============================================================================
-- 5. Policies — relatos_golpe
--    anon pode INSERIR (botão "Denunciar").
--    anon NÃO pode ler/editar/apagar.
--    authenticated lê tudo para moderação futura.
-- =============================================================================
drop policy if exists "anon_insert_relatos"   on public.relatos_golpe;
drop policy if exists "anon_select_relatos"   on public.relatos_golpe;
drop policy if exists "auth_all_relatos_golpe" on public.relatos_golpe;

create policy "anon_insert_relatos"
    on public.relatos_golpe
    for insert
    to anon
    with check (true);

create policy "auth_all_relatos_golpe"
    on public.relatos_golpe
    for all
    to authenticated
    using (true)
    with check (true);


-- =============================================================================
-- 6. Grants explícitos ao role anon
--    Necessários para que a chave sb_publishable_... acesse via PostgREST.
-- =============================================================================
grant usage on schema public to anon, authenticated;

grant select on public.dominios_golpe to anon;
grant insert on public.relatos_golpe  to anon;

grant select, insert, update, delete
    on public.dominios_golpe,
       public.relatos_golpe
    to authenticated;


-- =============================================================================
-- 7. Seed mínimo — apenas para o app sair do zero com alguma coisa.
--    Domínios reais conhecidos de phishing bancário no Brasil.
--    Mantenha confirmado = false até curadoria manual, OU true se tiver
--    certeza (eles vão aparecer imediatamente no scanner).
-- =============================================================================
insert into public.dominios_golpe (dominio, categoria, confirmado)
values
    ('bradesco-seguranca.com.br',  'phishing-bancario', false),
    ('itau-atualizar.com',          'phishing-bancario', false),
    ('nubank-suporte.net',          'phishing-bancario', false),
    ('caixa-acesso.com',            'phishing-bancario', false),
    ('santander-verificar.app',     'phishing-bancario', false)
on conflict (dominio) do nothing;


-- =============================================================================
-- 8. Verificação final (rode após o script e confira os contadores)
-- =============================================================================
-- select 'dominios_golpe' as tabela, count(*) from public.dominios_golpe
-- union all
-- select 'relatos_golpe',  count(*) from public.relatos_golpe;
