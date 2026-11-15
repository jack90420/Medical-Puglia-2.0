# DECISIONS.md

## Decisioni prese (Modalità Autonoma e Sicurezza)
1. **Riconciliazione Deploy**: Abbandono di Vercel in favore di Netlify (come da direttiva e configurazione `doctorishappy.netlify.app`), rimuovendo i riferimenti legacy.
2. **Cifratura API Keys**: Utilizzo di AES-256-GCM (`app/utils/encryption.ts`) con chiave derivata da `APP_ENCRYPTION_KEY` per proteggere le chiavi API utente in `user_api_keys`.
3. **Route Handlers Next.js**: Gestione della logica AI e tool calling interamente nei Route Handlers (`/app/api/chat/route.ts`) utilizzando il client Supabase con i cookie dell'utente per preservare l'RLS.
4. **Isolamento delle Migrazioni**: Salvataggio delle migrazioni SQL in `supabase/migrations/` per tracciabilità senza rieseguire quelle già applicate sul database remoto.
