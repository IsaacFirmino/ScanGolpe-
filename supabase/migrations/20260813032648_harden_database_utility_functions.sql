-- Endurece utilitários internos do banco e remove sua exposição pela Data API.
-- Os gatilhos existentes permanecem vinculados porque ALTER FUNCTION preserva o OID.

create schema if not exists private;

comment on schema private is
  'Objetos internos do banco que não devem ser expostos pela Data API.';

revoke all on schema private
  from public, anon, authenticated, service_role;

alter default privileges in schema private
  revoke execute on functions from public, anon, authenticated, service_role;

alter function public.tg_touch_updated_em() set schema private;

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

comment on function private.tg_touch_updated_em() is
  'Mantém atualizado_em sincronizado em triggers internos.';

alter function public.rls_auto_enable() set schema private;

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

comment on function private.rls_auto_enable() is
  'Habilita RLS automaticamente em novas tabelas do schema public.';

revoke all on function private.tg_touch_updated_em()
  from public, anon, authenticated, service_role;

revoke all on function private.rls_auto_enable()
  from public, anon, authenticated, service_role;
