-- ============================================================================
-- Correcao de GRANTs — o revoke anterior removeu os privilegios do role anon
-- e o reaplicamento nao os restaurou. Esta query os reaplica de forma minima.
-- ============================================================================

-- 1. Garantir acesso ao schema
grant usage on schema public to anon, authenticated;

-- 2. dominios_golpe: anon so le
grant select on public.dominios_golpe to anon;

-- 3. relatos_golpe: anon so insere
grant insert on public.relatos_golpe to anon;

-- 4. Confirmacao imediata (rode junto para checar)
select
    grantee,
    table_name,
    string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in ('dominios_golpe', 'relatos_golpe')
group by grantee, table_name
order by grantee, table_name;