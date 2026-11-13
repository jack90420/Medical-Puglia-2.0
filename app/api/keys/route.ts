import { NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { encryptApiKey } from '@/app/utils/encryption'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const { profilo_id, provider, api_key, modello_preferito } = body

    if (!profilo_id || !provider || !api_key) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    // Verifica che il profilo appartenga all'utente loggato
    const { data: profilo, error: profError } = await supabase
      .from('profili')
      .select('id')
      .eq('id', profilo_id)
      .eq('auth_user_id', user.id)
      .single()

    if (profError || !profilo) {
      return NextResponse.json({ error: 'Profilo non valido o non autorizzato' }, { status: 403 })
    }

    // Cifra la chiave con AES-256-GCM
    const chiave_cifrata = encryptApiKey(api_key)

    // Upsert in user_api_keys
    const { error: upsertError } = await supabase
      .from('user_api_keys')
      .upsert({
        profilo_id,
        provider,
        chiave_cifrata,
        modello_preferito: modello_preferito || 'anthropic/claude-3.5-sonnet'
      }, { onConflict: 'profilo_id,provider' })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Chiave API salvata e cifrata con successo' })
  } catch (err: any) {
    console.error('Errore salvataggio chiave:', err)
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 })
  }
}
