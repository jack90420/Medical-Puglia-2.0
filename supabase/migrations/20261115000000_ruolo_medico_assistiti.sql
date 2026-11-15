-- Nuova migrazione: 20261115000000_ruolo_medico_assistiti.sql
-- Aggiunta del ruolo utente ('paziente' | 'medico') e della relazione medico-paziente con richieste di associazione.

alter table public.profili
  add column if not exists ruolo text not null default 'paziente' check (ruolo in ('paziente', 'medico')),
  add column if not exists medico_id uuid references public.profili(id) on delete set null;

create table if not exists public.richieste_medico (
  id uuid key default gen_random_uuid(), -- fix syntax below
  id uuid primary key default gen_random_uuid(),
  paziente_id uuid not null references public.profili(id) on delete cascade,
  medico_id uuid not null references public.profili(id) on delete cascade,
  stato text not null default 'in_attesa' check (stato in ('in_attesa', 'approvata', 'rifiutata')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists richieste_medico_medico_idx on public.richieste_medico (medico_id, stato);
create index if not exists richieste_medico_paziente_idx on public.richieste_medico (paziente_id);

alter table public.richieste_medico enable row level security;

create policy own_richieste on public.richieste_medico for all to authenticated
  using (
    public.user_owns_profilo(paziente_id) or public.user_owns_profilo(medico_id)
  )
  with check (
    public.user_owns_profilo(paziente_id) or public.user_owns_profilo(medico_id)
  );

revoke all on public.richieste_medico from anon;
revoke truncate, references, trigger on public.richieste_medico from authenticated;

-- Aggiorna la policy RLS per consentire al medico associato di visualizzare i dati del proprio assistito
-- (diario, pasti, pesate, dati_medici, chat_messages)
drop policy if exists own_rows on public.pasti;
create policy own_rows on public.pasti for all to authenticated
  using (
    public.user_owns_profilo(profilo_id) or
    exists (
      select 1 from public.profili p
      where p.id = pasti.profilo_id and p.medico_id in (
        select id from public.profili where auth_user_id = (select auth.uid()) and ruolo = 'medico'
      )
    )
  )
  with check (public.user_owns_profilo(profilo_id));

drop policy if exists own_rows on public.diario_giornaliero;
create policy own_rows on public.diario_giornaliero for all to authenticated
  using (
    public.user_owns_profilo(profilo_id) or
    exists (
      select 1 from public.profili p
      where p.id = diario_giornaliero.profilo_id and p.medico_id in (
        select id from public.profili where auth_user_id = (select auth.uid()) and ruolo = 'medico'
      )
    )
  )
  with check (public.user_owns_profilo(profilo_id));

drop policy if exists own_rows on public.pesate;
create policy own_rows on public.pesate for all to authenticated
  using (
    public.user_owns_profilo(profilo_id) or
    exists (
      select 1 from public.profili p
      where p.id = pesate.profilo_id and p.medico_id in (
        select id from public.profili where auth_user_id = (select auth.uid()) and ruolo = 'medico'
      )
    )
  )
  with check (public.user_owns_profilo(profilo_id));

drop policy if exists own_rows on public.dati_medici;
create policy own_rows on public.dati_medici for all to authenticated
  using (
    public.user_owns_profilo(profilo_id) or
    exists (
      select 1 from public.profili p
      where p.id = dati_medici.profilo_id and p.medico_id in (
        select id from public.profili where auth_user_id = (select auth.uid()) and ruolo = 'medico'
      )
    )
  )
  with check (public.user_owns_profilo(profilo_id));
