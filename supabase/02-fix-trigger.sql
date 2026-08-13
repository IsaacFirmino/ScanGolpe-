drop trigger if exists trg_dominios_golpe_updated_em on public.dominios_golpe;
drop function if exists public.tg_touch_updated_em();
drop function if exists private.tg_touch_updated_em();
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;
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
revoke all on function private.tg_touch_updated_em() from public, anon, authenticated, service_role;
create trigger trg_dominios_golpe_updated_em before update on public.dominios_golpe for each row execute function private.tg_touch_updated_em();
