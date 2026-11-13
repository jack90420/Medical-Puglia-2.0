-- ============================================================================
-- MIGRATION: Creazione nuove tabelle (pasti, chat_messages, user_api_keys)
-- e verifica/riscrittura delle policy RLS per tutte le tabelle.
-- Regola: Riga accessibile solo se profilo_id appartiene a profili con auth_user_id = auth.uid()
-- ============================================================================

-- 1. Tabella PASTI
create table if not exists public.pasti (
  id uuid default gen_random_uuid() primary key,
  profilo_id uuid not null references public.profili(id) on delete cascade,
  data date not null default current_date,
  tipo_pasto text not null check (tipo_pasto in ('colazione', 'pranzo', 'cena', 'snack')),
  descrizione text not null,
  kcal numeric default 0,
  proteine_g numeric default 0,
  carboidrati_g numeric default 0,
  grassi_g numeric default 0,
  fibre_g numeric default 0,
  alcol_g numeric default 0,
  micronutrienti jsonb default '{}'::jsonb,
  stimato boolean default true,
  created_at timestamptz default now()
);

-- 2. Tabella CHAT_MESSAGES
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  profilo_id uuid not null references public.profili(id) on delete cascade,
  data date not null default current_date,
  ruolo text not null check (ruolo in ('user', 'assistant', 'system')),
  contenuto text not null,
  created_at timestamptz default now()
);

-- 3. Tabella USER_API_KEYS
create table if not exists public.user_api_keys (
  profilo_id uuid not null references public.profili(id) on delete cascade,
  provider text not null,
  chiave_cifrata text not null,
  modello_preferito text,
  primary key (profilo_id, provider)
);

-- ============================================================================
-- ATTIVAZIONE RLS E POLICY DI SICUREZZA
-- ============================================================================

alter table public.pasti enable row level security;
alter table public.chat_messages enable row level security;
alter table public.user_api_keys enable row level security;
alter table public.diario_giornaliero enable row level security;
alter table public.pesate enable row level security;
alter table public.dati_medici enable row level security;
alter table public.profili enable row level security;
alter table public.api_usage enable row level security;

-- Funzione helper per verificare che il profilo appartenga all'utente autenticato
create or replace function public.user_owns_profilo(p_profilo_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.profili
    where id = p_profilo_id and auth_user_id = auth.uid()
  );
end;
$$ language plpgsql security definerv;

-- RLS per PROFILI
drop policy if exists "Users can access own profile" on public.profili;
create policy "Users can access own profile" on public.profili
  for all using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- RLS per DIARIO_GIORNALIERO
drop policy if exists "Users can access own diario_giornaliero" on public.diario_giornaliero;
create policy "Users can access own diario_giornaliero" on public.diario_giornaliero
  for all using (public.user_owns_profilo(profilo_id))
  with check (public.user_owns_profilo(profilo_id));

-- RLS per PESATE
drop policy if exists "Users can access own pesate" on public.pesate;
create policy "Users can access own pesate" on public.pesate
  for all using (public.user_owns_profilo(profilo_id))
  with check (public.user_owns_profilo(profilo_id));

-- RLS per DATI_MEDICI
drop policy if exists "Users can access own dati_medici" on public.dati_medici;
create policy "Users can access own dati_medici" on public.dati_medici
  for all using (public.user_owns_profilo(profilo_id))
  with check (public.user_owns_profilo(profilo_id));

-- RLS per API_USAGE
drop policy if exists "Users can access own api_usage" on public.api_usage;
create policy "Users can access own api_usage" on public.api_usage
  for all using (public.user_owns_profilo(profilo_id))
  with check (public.user_owns_profilo(profilo_id));

-- RLS per PASTI
drop policy if exists "Users can access own pasti" on public.pasti;
create policy "Users can access own pasti" on public.pasti
  for all using (public.user_owns_profilo(profilo_id))
  with check (public.user_owns_profilo(profilo_id));

-- RLS per CHAT_MESSAGES
drop policy if exists "Users can access own chat_messages" on public.chat_messages;
create policy "Users can access own chat_messages" on public.chat_messages
  for all using (public.user_owns_profilo(profilo_id))
  with check (public.user_owns_profilo(profilo_id));

-- RLS per USER_API_KEYS
drop policy if exists "Users can access own user_api_keys" on public.user_api_keys;
create policy "Users can access own user_api_keys" on public.user_api_keys
  for all using (public.user_owns_profilo(profilo_id))
  with check (public.user_owns_profilo(profilo_id));
