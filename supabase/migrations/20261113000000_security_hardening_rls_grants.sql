-- 20261113000000_security_hardening_rls_grants.sql
create or replace function public.user_owns_profilo(p_profilo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profili
    where id = p_profilo_id and auth_user_id = (select auth.uid())
  );
$$;

create policy own_rows on public.api_usage            for all to authenticated using (public.user_owns_profilo(profilo_id)) with check (public.user_owns_profilo(profilo_id));
create policy own_rows on public.chat_messages        for all to authenticated using (public.user_owns_profilo(profilo_id)) with check (public.user_owns_profilo(profilo_id));
create policy own_rows on public.dati_medici          for all to authenticated using (public.user_owns_profilo(profilo_id)) with check (public.user_owns_profilo(profilo_id));
create policy own_rows on public.diario_giornaliero   for all to authenticated using (public.user_owns_profilo(profilo_id)) with check (public.user_owns_profilo(profilo_id));
create policy own_rows on public.pasti                for all to authenticated using (public.user_owns_profilo(profilo_id)) with check (public.user_owns_profilo(profilo_id));
create policy own_rows on public.pesate               for all to authenticated using (public.user_owns_profilo(profilo_id)) with check (public.user_owns_profilo(profilo_id));
create policy own_rows on public.user_api_keys        for all to authenticated using (public.user_owns_profilo(profilo_id)) with check (public.user_owns_profilo(profilo_id));
create policy own_rows on public.profili              for all to authenticated using (auth_user_id = (select auth.uid())) with check (auth_user_id = (select auth.uid()));

drop policy if exists "Users can access own api_usage" on public.api_usage;
drop policy if exists usage_proprio on public.api_usage;
drop policy if exists "Users can access own chat_messages" on public.chat_messages;
drop policy if exists "Users can access own dati_medici" on public.dati_medici;
drop policy if exists medici_propri on public.dati_medici;
drop policy if exists "Users can access own diario_giornaliero" on public.diario_giornaliero;
drop policy if exists diario_proprio on public.diario_giornaliero;
drop policy if exists "Users can access own pasti" on public.pasti;
drop policy if exists "Users can access own pesate" on public.pesate;
drop policy if exists pesate_proprie on public.pesate;
drop policy if exists "Users can access own user_api_keys" on public.user_api_keys;
drop policy if exists "Users can access own profile" on public.profili;
drop policy if exists profili_propri on public.profili;

revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

revoke execute on function public.crea_profilo_su_signup() from public, anon, authenticated;
revoke execute on function public.user_owns_profilo(uuid) from public, anon;
grant execute on function public.user_owns_profilo(uuid) to authenticated;
