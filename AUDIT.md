# AUDIT.md — Fase 1 (Sola lettura e stato reale)

## 1. Stato del Repository e File Esistenti
Il repository locale `Medical-Puglia-2.0` (su `/c/Users/acalo/Medical-Puglia-2.0`) contiene:
- **Framework**: Next.js 15 (App Router), TypeScript, Tailwind CSS.
- **Dipendenze principali**: `@supabase/ssr`, `lucide-react`.
- **Pagine e Componenti**:
  - `app/page.tsx`: Applicazione client principale con tab (Diario, Chat, Peso, Statistiche, Impostazioni), gestione dati giornalieri, pasti, chat AI e inserimento chiave API.
  - `app/login/page.tsx`: Pagina di login/registrazione basata su Supabase Auth.
  - `app/api/chat/route.ts`: Route handler per l'interazione con OpenRouter (o compatibili OpenAI) con supporto a tool calling (`aggiungi_pasti`, `salva_pesata`, `totale_oggi`, `chiudi_giornata`), prompt di sistema dinamico basato sul profilo, registrazione token (`api_usage`) e messaggi (`chat_messages`).
  - `app/api/keys/route.ts`: Route handler per il salvataggio cifrato (AES-256-GCM) delle chiavi API in `user_api_keys`.
  - `app/utils/encryption.ts`: Libreria di cifratura/decifratura AES-256-GCM tramite `APP_ENCRYPTION_KEY`.
  - `app/utils/supabase/server.ts` e `client.ts`: Client Supabase SSR configurati correttamente.

## 2. Confronto con lo Stato del Database e Regole di Sicurezza
- **Progetto Supabase**: `zepjnkscfierdaehzyro` (`https://zepjnkscfierdaehzyro.supabase.co`).
- **RLS e Security Hardening**:
  - Le policy RLS basate su `public.user_owns_profilo(uuid)` (con `security definer` e `search_path = public`) sono già applicate sul database remoto.
  - Le tabelle dispongono di un'unica policy `own_rows` riservata al ruolo `authenticated`.
  - Il ruolo `anon` è privo di privilegi sulle tabelle pubbliche.
- **Profilo Storico**:
  - `profili.id = '83125bfa-17cf-416b-8ab3-8ba16234ac4c'` ("Andrea Calora") è già collegato all'utente di autenticazione (`auth_user_id`).

## 3. Aree da Migliorare / Risolvere nelle Fasi Successive
1. **Auth Gate**: L'home page (`app/page.tsx`) attualmente carica direttamente il primo profilo disponibile senza un solido auth middleware o redirect se l'utente non è autenticato.
2. **Onboarding**: Mancanza del wizard di onboarding per nuovi utenti (`onboarding_completato = false`).
3. **Chat AI (Microfono)**: Manca l'integrazione con la Web Speech API per dettare i pasti tramite microfono.
4. **Deploy & Netlify**: Configurazione di `netlify.toml` per il deploy su Netlify (dismettendo Vercel).
5. **Test & UI**: Copertura con test Playwright e rifinimenti visivi.
