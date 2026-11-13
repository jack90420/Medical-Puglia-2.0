import { NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { decryptApiKey } from '@/app/utils/encryption'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Trova il profilo associato all'utente
    const { data: profilo, error: profiloError } = await supabase
      .from('profili')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (profiloError || !profilo) {
      return NextResponse.json({ error: 'Profilo non trovato o non collegato' }, { status: 404 })
    }

    const body = await request.json()
    const { message, data_corrente } = body
    const dataOggi = data_corrente || new Date().toISOString().split('T')[0]

    // Leggi chiave API utente per openrouter (o openai)
    const { data: apiKeyRow } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('profilo_id', profilo.id)
      .eq('provider', 'openrouter')
      .single()

    let apiKey = process.env.OPENROUTER_API_KEY || ''
    let model = apiKeyRow?.modello_preferito || 'anthropic/claude-3.5-sonnet'

    if (apiKeyRow?.chiave_cifrata) {
      try {
        apiKey = decryptApiKey(apiKeyRow.chiave_cifrata)
      } catch (e) {
        console.error('Errore decifratura chiave:', e)
      }
    }

    if (!apiKey) {
      return NextResponse.json({
        error: 'Nessuna chiave API configurata. Vai nelle Impostazioni per inserire la tua chiave OpenRouter.'
      }, { status: 400 })
    }

    // Registra messaggio utente in chat_messages
    await supabase.from('chat_messages').insert({
      profilo_id: profilo.id,
      data: dataOggi,
      ruolo: 'user',
      contenuto: message
    })

    // Costruisci il prompt di sistema dinamico con gli obiettivi letti da profili
    const systemPrompt = `Sei il mio diario alimentare. Tono informale, diretto, ironico ma benevolo, mai da report burocratico.
Obiettivi giornalieri: Kcal min ${profilo.obiettivo_kcal_min || 1800}, max ${profilo.obiettivo_kcal_max || 2200}, Proteine min ${profilo.obiettivo_proteine_min || 120}g, Carboidrati max ${profilo.obiettivo_carboidrati_max || 250}g, Grassi max ${profilo.obiettivo_grassi_max || 70}g.
Dopo OGNI pasto: valori del pasto (kcal, P, C, G, fibre); in grassetto TOTALE GIORNATA; in grassetto MANCANO (valore e % rispetto agli obiettivi; se li supero scrivilo con '+' e un avviso ironico breve). Dichiara le assunzioni solo se incerte. Se correggo un pasto, ricalcola. Con 'chiudi' stima anche i micronutrienti, salva il giorno con valori_stimati = true, verifica i 5 giorni precedenti, elenca i mancanti senza inventare dati e conferma sempre per iscritto. Con 'peso X' registra una pesata di oggi. Se mangio chia o semi di lino conta l'ALA negli omega-3. Non proporre mai pesce: per gli omega-3 usa alternative vegetali o alghe. Se manca un dato e non puoi stimarlo, chiedilo. Dopo ogni scrittura conferma in una riga cosa hai salvato. All'inizio di ogni nuova chat controlla in silenzio gli ultimi 20 giorni e parla solo se scatta una soglia: ultima pesata oltre 7 giorni fa, meno di 16 giorni registrati su 20, fibre medie sotto 20 g, alcol medio sopra 20 g, kcal medie sopra 1900 o proteine sotto 110 g, peso fermo o in salita con peso sopra 80 kg. In quel caso ramanzina ironica di 1-3 righe con i numeri chiave e UNA cosa concreta da fare.`

    // Definiamo i tool disponibili per il modello
    const tools = [
      {
        type: 'function',
        function: {
          name: 'aggiungi_pasto',
          description: 'Aggiunge un pasto registrato (colazione, pranzo, cena, snack) con kcal e macro stimati.',
          parameters: {
            type: 'object',
            properties: {
              tipo_pasto: { type: 'string', enum: ['colazione', 'pranzo', 'cena', 'snack'] },
              descrizione: { type: 'string' },
              kcal: { type: 'number' },
              proteine_g: { type: 'number' },
              carboidrati_g: { type: 'number' },
              grassi_g: { type: 'number' },
              fibre_g: { type: 'number' },
              alcol_g: { type: 'number' }
            },
            required: ['tipo_pasto', 'descrizione', 'kcal', 'proteine_g', 'carboidrati_g', 'grassi_g']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'salva_pesata',
          description: 'Registra una nuova pesata corporea per oggi.',
          parameters: {
            type: 'object',
            properties: {
              peso_kg: { type: 'number' },
              massa_grassa_pct: { type: 'number' },
              massa_muscolare_kg: { type: 'number' },
              note: { type: 'string' }
            },
            required: ['peso_kg']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'totale_oggi',
          description: 'Calcola il totale delle calorie e macro mangiati oggi.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'chiudi_giornata',
          description: 'Chiude la giornata odierna salvando il riepilogo in diario_giornaliero.',
          parameters: {
            type: 'object',
            properties: {
              note: { type: 'string' }
            }
          }
        }
      }
    ]

    // Chiamata a OpenRouter (API compatibile OpenAI)
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://medical-puglia.vercel.app',
        'X-Title': 'Diario Alimentare AI'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        tools: tools,
        tool_choice: 'auto'
      })
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      return NextResponse.json({ error: `Errore provider AI: ${errText}` }, { status: 502 })
    }

    const aiData = await aiResponse.json()
    const choice = aiData.choices?.[0]
    let assistantMessage = choice?.message?.content || ''
    const toolCalls = choice?.message?.tool_calls

    // Gestione esecuzione tool se presenti
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const args = JSON.parse(toolCall.function.arguments)
        const fnName = toolCall.function.name

        if (fnName === 'aggiungi_pasto') {
          await supabase.from('pasti').insert({
            profilo_id: profilo.id,
            data: dataOggi,
            tipo_pasto: args.tipo_pasto,
            descrizione: args.descrizione,
            kcal: args.kcal || 0,
            proteine_g: args.proteine_g || 0,
            carboidrati_g: args.carboidrati_g || 0,
            grassi_g: args.grassi_g || 0,
            fibre_g: args.fibre_g || 0,
            alcol_g: args.alcol_g || 0,
            stimato: true
          })
          if (!assistantMessage) {
            assistantMessage = `Registrato ${args.tipo_pasto}: ${args.descrizione} (${args.kcal} kcal).`
          }
        } else if (fnName === 'salva_pesata') {
          await supabase.from('pesate').upsert({
            profilo_id: profilo.id,
            data: dataOggi,
            peso_kg: args.peso_kg,
            massa_grassa_pct: args.massa_grassa_pct || null,
            massa_muscolare_kg: args.massa_muscolare_kg || null,
            fonte: 'bilancia_smart',
            note: args.note || 'Inserito via chat'
          }, { onConflict: 'profilo_id,data' })
          if (!assistantMessage) {
            assistantMessage = `Pesata registrata: ${args.peso_kg} kg.`
          }
        } else if (fnName === 'totale_oggi') {
          const { data: pastiOggi } = await supabase
            .from('pasti')
            .select('*')
            .eq('profilo_id', profilo.id)
            .eq('data', dataOggi)

          const totKcal = pastiOggi?.reduce((acc, p) => acc + (Number(p.kcal) || 0), 0) || 0
          const totProt = pastiOggi?.reduce((acc, p) => acc + (Number(p.proteine_g) || 0), 0) || 0
          assistantMessage = `Totale oggi (${dataOggi}): ${totKcal} kcal, ${totProt}g proteine.`
        } else if (fnName === 'chiudi_giornata') {
          const { data: pastiOggi } = await supabase
            .from('pasti')
            .select('*')
            .eq('profilo_id', profilo.id)
            .eq('data', dataOggi)

          const totKcal = pastiOggi?.reduce((acc, p) => acc + (Number(p.kcal) || 0), 0) || 0
          const totProt = pastiOggi?.reduce((acc, p) => acc + (Number(p.proteine_g) || 0), 0) || 0
          const totCarb = pastiOggi?.reduce((acc, p) => acc + (Number(p.carboidrati_g) || 0), 0) || 0
          const totGrass = pastiOggi?.reduce((acc, p) => acc + (Number(p.grassi_g) || 0), 0) || 0
          const totFibre = pastiOggi?.reduce((acc, p) => acc + (Number(p.fibre_g) || 0), 0) || 0

          await supabase.from('diario_giornaliero').upsert({
            profilo_id: profilo.id,
            data: dataOggi,
            kcal: totKcal,
            proteine_g: totProt,
            carboidrati_g: totCarb,
            grassi_g: totGrass,
            fibre_g: totFibre,
            valori_stimati: true,
            note: args.note || 'Chiusura giornata via chat AI'
          }, { onConflict: 'profilo_id,data' })

          assistantMessage = `Giornata ${dataOggi} chiusa con successo! Totale: ${totKcal} kcal.`
        }
      }
    }

    if (!assistantMessage) {
      assistantMessage = 'Ricevuto e registrato correttamente.'
    }

    // Registra risposta assistente in chat_messages
    await supabase.from('chat_messages').insert({
      profilo_id: profilo.id,
      data: dataOggi,
      ruolo: 'assistant',
      contenuto: assistantMessage
    })

    // Registra utilizzo token in api_usage se presenti
    if (aiData.usage) {
      await supabase.from('api_usage').insert({
        profilo_id: profilo.id,
        provider: 'openrouter',
        modello: model,
        prompt_tokens: aiData.usage.prompt_tokens || 0,
        completion_tokens: aiData.usage.completion_tokens || 0,
        total_tokens: aiData.usage.total_tokens || 0
      })
    }

    return NextResponse.json({ success: true, message: assistantMessage })
  } catch (err: any) {
    console.error('Errore API chat:', err)
    return NextResponse.json({ error: err.message || 'Errore interno del server' }, { status: 500 })
  }
}
