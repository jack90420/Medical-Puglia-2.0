# TODO_UTENTE.md

## Passi manuali per l'utente

1. **Accessi CLI**:
   - Esegui `gh auth login` per autenticarti con GitHub.
   - Esegui `netlify login` per autenticarti con Netlify.
   - Esegui `supabase login` per autenticarti con Supabase CLI.

2. **Strategia Email Supabase**:
   - Lascia attiva la conferma email predefinita di Supabase (con i limiti del piano gratuito) oppure configura un provider SMTP personalizzato (es. Resend) nelle impostazioni di Supabase Auth.

3. **Variabili d'Ambiente su Netlify**:
   - Configura le seguenti variabili nel pannello di Netlify (Site Settings > Environment variables):
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `APP_ENCRYPTION_KEY` (stringa segreta casuale per cifratura AES-256-GCM)

4. **URL di reindirizzamento Supabase**:
   - In Supabase Auth > URL Configuration, aggiungi il dominio Netlify (`https://doctorishappy.netlify.app/auth/callback`) e `http://localhost:3000/auth/callback`.

5. **Pulizia Vercel e Visibilità Repo**:
   - Cancella il vecchio progetto di test su Vercel.
   - Assicurati che il repository GitHub sia impostato su **Privato** (fondamentale per la privacy dei dati sanitari presenti nel database).
