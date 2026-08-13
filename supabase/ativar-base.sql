-- ============================================================================
-- Ativa 2 dominios da seed como confirmados para o scanner passar a reconhece-los.
-- Apos rodar, faca tambem: NOTIFY pgrst, 'reload schema';
-- (ja incluido abaixo)
-- ============================================================================

update public.dominios_golpe
set confirmado = true
where dominio in ('bradesco-seguranca.com.br', 'nubank-suporte.net');

select dominio, categoria, confirmado
from public.dominios_golpe
order by confirmado desc, dominio;

NOTIFY pgrst, 'reload schema';