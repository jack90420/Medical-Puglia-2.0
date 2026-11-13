# Diario: app alimentare stile Yazio con AI (`Medical-Puglia-2.0`)

PWA mobile-first ispirata a Yazio potenziata da intelligenza artificiale tramite chat e tool, con backend Supabase e cifratura chiavi utente AES-256-GCM.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (`@supabase/ssr`) con RLS rigorosa su tutte le tabelle
- Route Handlers Next.js per la logica AI e tool calling (OpenRouter / OpenAI compatible)
- Capacitor per Android APK (WebView verso Vercel)

## Configurazione e Passi Manuali

1. **Supabase Auth & Profilo**:
   - Registra l'utente in Supabase Auth: `a.calora.98@gmail.com`.
   - Collega il profilo nel database SQL:
     ```sql
     update profili set auth_user_id = '<uuid_utente>' where id = '83125bfa-17cf-416b-8ab3-8ba16234ac4c';
     ```
   - Esegui la migrazione SQL presente in `supabase/migrations/20261113000000_init_tables_and_rls.sql`.

2. **Environment Variables (.env.local)**:
   Copia `.env.example` in `.env.local` e compila le variabili:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `APP_ENCRYPTION_KEY` (stringa segreta per cifratura AES-256-GCM delle chiavi API utente)

3. **Esecuzione in locale**:
   ```bash
   npm install
   npm run dev
   ```
   Apri [http://localhost:3000](http://localhost:3000).

4. **Deploy su Vercel**:
   Collega il repository a Vercel impostando le medesime Environment Variables.
