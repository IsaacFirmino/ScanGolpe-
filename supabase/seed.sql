-- ============================================================================
-- Seed das tabelas — roda separado para garantir que nada se perde caso o
-- schema.sql tenha falhado parcialmente.
-- Use ON CONFLICT para nao duplicar em rodadas subsequentes.
-- ============================================================================

insert into public.dominios_golpe (dominio, categoria, confirmado) values
    ('bradesco-seguranca.com.br',  'phishing-bancario', false),
    ('itau-atualizar.com',          'phishing-bancario', false),
    ('nubank-suporte.net',          'phishing-bancario', false),
    ('caixa-acesso.com',            'phishing-bancario', false),
    ('santander-verificar.app',     'phishing-bancario', false)
on conflict (dominio) do nothing;

-- Checagem
select 'dominios_golpe' as tabela, count(*) as total, count(*) filter (where confirmado) as confirmados
from public.dominios_golpe
union all
select 'relatos_golpe',  count(*), null
from public.relatos_golpe;