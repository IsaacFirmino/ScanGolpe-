-- Projetos antigos podem conceder privilégios automáticos a novas tabelas.
-- Reaplica o princípio do menor privilégio depois da criação do histórico.

revoke all on table public.historico_analises from authenticated;
grant select, insert, delete on table public.historico_analises to authenticated;

revoke all on sequence public.historico_analises_id_seq from authenticated;
grant usage, select on sequence public.historico_analises_id_seq to authenticated;
