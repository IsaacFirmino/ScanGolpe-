-- Mantém a lista de domínios confirmados somente para leitura no navegador.
alter table public.dominios_golpe enable row level security;

drop policy if exists "auth_all_dominios_golpe" on public.dominios_golpe;
drop policy if exists "authenticated_select_confirmados" on public.dominios_golpe;

create policy "authenticated_select_confirmados"
on public.dominios_golpe
for select
to authenticated
using (confirmado = true);

revoke all privileges on table public.dominios_golpe from anon, authenticated;
grant select on table public.dominios_golpe to anon, authenticated;

-- O navegador pode enviar denúncias, mas não pode listá-las, alterá-las ou moderá-las.
alter table public.relatos_golpe enable row level security;

drop policy if exists "auth_all_relatos_golpe" on public.relatos_golpe;
drop policy if exists "authenticated_insert_relatos" on public.relatos_golpe;
drop policy if exists "anon_insert_relatos" on public.relatos_golpe;

create policy "anon_insert_relatos"
on public.relatos_golpe
for insert
to anon
with check (
  status = 'pendente'
  and char_length(btrim(conteudo)) between 1 and 10000
  and coalesce(char_length(dominio), 0) <= 253
  and coalesce(confianca, 0) between 0 and 100
);

create policy "authenticated_insert_relatos"
on public.relatos_golpe
for insert
to authenticated
with check (
  status = 'pendente'
  and char_length(btrim(conteudo)) between 1 and 10000
  and coalesce(char_length(dominio), 0) <= 253
  and coalesce(confianca, 0) between 0 and 100
);

revoke all privileges on table public.relatos_golpe from anon, authenticated;
grant insert on table public.relatos_golpe to anon, authenticated;
