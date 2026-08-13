-- ============================================================================
-- Diagnostico: confirma schema real das tabelas e visibilidade via PostgREST
-- ============================================================================

-- 1. Schema real das tabelas
select table_schema, table_name
from information_schema.tables
where table_name in ('dominios_golpe', 'relatos_golpe')
order by table_name;

-- 2. Contagem real
select 'dominios_golpe' as tabela, count(*) as total
from public.dominios_golpe
union all
select 'relatos_golpe', count(*) from public.relatos_golpe;

-- 3. Forca reload do PostgREST (rode tambem apos qualquer mudanca estrutural)
NOTIFY pgrst, 'reload schema';