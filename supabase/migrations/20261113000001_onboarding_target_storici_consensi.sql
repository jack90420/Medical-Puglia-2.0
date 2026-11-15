-- 20261113000001_onboarding_target_storici_consensi.sql
alter table public.profili
  add column if not exists onboarding_completato boolean not null default false,
  add column if not exists obiettivo_peso text check (obiettivo_peso in ('perdere','mantenere','aumentare')),
  add column if not exists ritmo_settimanale_kg numeric check (ritmo_settimanale_kg is null or (ritmo_settimanale_kg >= 0 and ritmo_settimanale_kg <= 1)),
  add column if not exists condizioni_dichiarate text[] not null default '{}',
  add column if not exists target_micronutrienti jsonb not null default '{}'::jsonb,
  add column if not exists target_calcolati_at timestamptz,
  add column if not exists consenso_dati_sanitari_at timestamptz,
  add column if not exists consenso_versione text;

create table if not exists public.target_storici (
  id uuid primary key default gen_random_uuid(),
  profilo_id uuid not null references public.profili(id) on delete cascade,
  valido_dal date not null default current_date,
  kcal_min integer, kcal_max integer,
  proteine_min integer, proteine_max integer,
  carbo_min integer, carbo_max integer,
  grassi_min integer, grassi_max integer,
  fibre_min integer,
  micronutrienti jsonb not null default '{}'::jsonb,
  origine text not null default 'manuale' check (origine in ('onboarding','manuale','ricalcolo')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists target_storici_profilo_data_idx on public.target_storici (profilo_id, valido_dal desc);

alter table public.target_storici enable row level security;
create policy own_rows on public.target_storici for all to authenticated
  using (public.user_owns_profilo(profilo_id)) with check (public.user_owns_profilo(profilo_id));

revoke all on public.target_storici from anon;
revoke truncate, references, trigger on public.target_storici from authenticated;
