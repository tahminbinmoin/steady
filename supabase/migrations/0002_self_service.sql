-- =============================================================================
-- 0002_self_service.sql
-- Lets signed-in users set their own timezone and delete their own account
-- through guarded database functions, so the app needs no secret key.
-- The same protections apply: valid IANA names only, one change per 24 hours
-- after the first, and the date floor that stops a switch from reopening a
-- finished day.
-- =============================================================================

create or replace function public.set_my_timezone(p_timezone text, p_source text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  return public.apply_timezone(v_uid, p_timezone, p_source);
end;
$$;

revoke execute on function public.set_my_timezone(text, text) from public, anon;
grant  execute on function public.set_my_timezone(text, text) to authenticated;

-- Deletes the caller's auth user; cascades to profiles → objectives → entries.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;
