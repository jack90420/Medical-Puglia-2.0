'use client'

import { useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { Flame, ArrowRight, ShieldCheck } from 'lucide-react'

export default function OnboardingModal({ profilo, onCompleted }: { profilo: any, onCompleted: () => void }) {
  const [nome, setNome] = useState(profilo?.nome || '')
  const [sesso, setSesso] = useState(profilo?.sesso || 'M')
  const [eta, setEta] = useState(30)
  const [altezza, setAltezza] = useState(175)
  const [peso, setPeso] = useState(75)
  const [pesoObiettivo, setPesoObiettivo] = useState(70)
  const [obiettivoPeso, setObiettivoPeso] = useState('perdere')
  const [attivita, setAttivita] = useState('1.375') // sedentario / leggero
  const [consenso, setConsenso] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleOnboardingSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consenso) {
      alert('È necessario accettare il trattamento dei dati sanitari per procedere.')
      return
    }

    setLoading(true)

    // Calcolo BMR (Mifflin-St Jeor)
    let bmr = (10 * peso) + (6.25 * altezza) - (5 * eta)
    bmr = sesso === 'M' ? bmr + 5 : bmr - 161

    const tdee = Math.round(bmr * Number(attivita))
    let targetKcal = tdee
    if (obiettivoPeso === 'perdere') targetKcal -= 500
    if (obiettivoPeso === 'aumentare') targetKcal += 300

    const targetProt = Math.round(peso * 2) // 2g per kg
    const targetCarbo = Math.round((targetKcal * 0.45) / 4)
    const targetGrass = Math.round((targetKcal * 0.25) / 9)

    // Aggiorna profilo
    await supabase.from('profili').update({
      nome,
      sesso,
      altezza_cm: altezza,
      peso_attuale_kg: peso,
      peso_obiettivo_kg: pesoObiettivo,
      obiettivo_peso: obiettivoPeso,
      obiettivo_kcal_min: targetKcal - 150,
      obiettivo_kcal_max: targetKcal + 150,
      obiettivo_proteine_min: targetProt,
      obiettivo_carboidrati_max: targetCarbo,
      obiettivo_grassi_max: targetGrass,
      onboarding_completato: true,
      consenso_dati_sanitari_at: new Date().toISOString(),
      consenso_versione: '1.0'
    }).eq('id', profilo.id)

    // Crea target storico
    await supabase.from('target_storici').insert({
      profilo_id: profilo.id,
      valido_dal: new Date().toISOString().split('T')[0],
      kcal_min: targetKcal - 150,
      kcal_max: targetKcal + 150,
      proteine_min: targetProt,
      carbo_max: targetCarbo,
      grassi_max: targetGrass,
      origine: 'onboarding',
      note: 'Generato automaticamente da onboarding'
    })

    setLoading(false)
    onCompleted()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md border border-slate-700 space-y-6 my-auto">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
            <Flame className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Benvenuto nel tuo Diario AI</h2>
          <p className="text-xs text-slate-400">Impostiamo i tuoi obiettivi nutrizionali personalizzati.</p>
        </div>

        <form onSubmit={handleOnboardingSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400">Il tuo Nome</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Sesso</label>
              <select
                value={sesso}
                onChange={e => setSesso(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="M">Maschio</option>
                <option value="F">Femmina</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Età</label>
              <input
                type="number"
                value={eta}
                onChange={e => setEta(Number(e.target.value))}
                required
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-slate-400">Altezza (cm)</label>
              <input
                type="number"
                value={altezza}
                onChange={e => setAltezza(Number(e.target.value))}
                required
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={peso}
                onChange={e => setPeso(Number(e.target.value))}
                required
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Obiettivo (kg)</label>
              <input
                type="number"
                step="0.1"
                value={pesoObiettivo}
                onChange={e => setPesoObiettivo(Number(e.target.value))}
                required
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400">Obiettivo Principale</label>
            <select
              value={obiettivoPeso}
              onChange={e => setObiettivoPeso(e.target.value)}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="perdere">Perdere peso (Deficit)</option>
              <option value="mantenere">Mantenere il peso</option>
              <option value="aumentare">Aumentare massa (Surplus)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Livello di Attività Fisica</label>
            <select
              value={attivita}
              onChange={e => setAttivita(e.target.value)}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="1.2">Sedentario (poco o nessun esercizio)</option>
              <option value="1.375">Leggero (esercizio 1-3 giorni/settimana)</option>
              <option value="1.55">Moderato (esercizio 3-5 giorni/settimana)</option>
              <option value="1.725">Intenso (esercizio 6-7 giorni/settimana)</option>
            </select>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              id="consenso"
              checked={consenso}
              onChange={e => setConsenso(e.target.checked)}
              className="mt-1 rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="consenso" className="text-xs text-slate-300">
              Acconsento al trattamento dei miei dati sanitari e nutrizionali per il calcolo dei target e l'assistenza dell'AI.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-sm transition shadow flex items-center justify-center gap-2"
          >
            {loading ? 'Elaborazione in corso...' : 'Inizia il Diario'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
