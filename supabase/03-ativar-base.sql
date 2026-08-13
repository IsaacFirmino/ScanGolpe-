update public.dominios_golpe set confirmado = true where dominio in ('bradesco-seguranca.com.br', 'nubank-suporte.net');
NOTIFY pgrst, 'reload schema';