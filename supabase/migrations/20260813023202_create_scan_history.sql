-- Histórico privado de análises do ScanGolpe.
-- Cada registro pertence ao usuário autenticado que executou o scanner.

create table public.historico_analises (
    id                  bigint generated always as identity primary key,
    user_id             uuid        not null default auth.uid()
                                    references auth.users (id) on delete cascade,
    tipo                text        not null
                                    check (tipo in ('mensagem', 'link', 'pix', 'anuncio')),
    conteudo            text        not null
                                    check (char_length(conteudo) between 1 and 10000),
    dominio             text,
    risco               text        not null
                                    check (risco in ('low', 'medium', 'high', 'critical')),
    pontuacao           smallint    not null
                                    check (pontuacao between 0 and 100),
    confianca           smallint    not null
                                    check (confianca between 0 and 100),
    titulo              text        not null,
    resumo              text        not null,
    sinais              jsonb       not null default '[]'::jsonb
                                    check (jsonb_typeof(sinais) = 'array'),
    verificado_online   boolean     not null default false,
    criado_em           timestamptz not null default now()
);

comment on table public.historico_analises is
    'Análises executadas por usuários autenticados; acesso isolado por RLS.';
comment on column public.historico_analises.user_id is
    'Proprietário do registro no Supabase Auth.';
comment on column public.historico_analises.sinais is
    'Snapshot dos sinais explicáveis encontrados pelo motor no momento da análise.';

create index historico_analises_user_id_desc_idx
    on public.historico_analises (user_id, id desc);

alter table public.historico_analises enable row level security;

create policy historico_analises_select_own
    on public.historico_analises
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy historico_analises_insert_own
    on public.historico_analises
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy historico_analises_delete_own
    on public.historico_analises
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

revoke all on table public.historico_analises from anon;
grant select, insert, delete on table public.historico_analises to authenticated;

revoke all on sequence public.historico_analises_id_seq from anon;
grant usage, select on sequence public.historico_analises_id_seq to authenticated;
