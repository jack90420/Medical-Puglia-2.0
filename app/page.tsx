'use client'

import { useState, useEffect } from 'react'
import { Calendar, MessageSquare, Activity, BarChart2, Settings, Plus, Flame, ArrowLeft, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/app/utils/supabase/client'
import { useRouter } from 'next/navigation'
import ChatTab from '@/app/components/ChatTab'
import ImpostazioniTab from '@/app/components/ImpostazioniTab'
import OnboardingModal from '@/app/components/OnboardingModal'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'diario' | 'chat' | 'peso' | 'statistiche' | 'impostazioni'>('diario')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [profilo, setProfilo] = useState<any>(null)
  const [pasti, setPasti] = useState<any[]>([])
  const [pesate, setPesate] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddPasto, setShowAddPasto] = useState(false)
  const [tipoPastoInput, setTipoPastoInput] = useState('pranzo')
  const [descPastoInput, setDescPastoInput] = useState('')
  const [kcalPastoInput, setKcalPastoInput] = useState('')
  const [protPastoInput, setProtPastoInput] = useState('')
  const [carbPastoInput, setCarbPastoInput] = useState('')
  const [grassPastoInput, setGrassPastoInput] = useState('')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadUserData()
  }, [selectedDate])

  async function loadUserData() {
    setLoading(true)

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      router.push('/login')
      return
    }

    // Prendi il profilo associato all'auth_user_id dell'utente loggato
    const { data: prof, error: profError } = await supabase
      .from('profili')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (profError || !prof) {
      // Fallback: prova a prendere il primo profilo se non legato (per retrocompatibilità test)
      const { data: profFallback } = await supabase
        .from('profili')
        .select('*')
        .limit(1)
        .single()

      if (profFallback) {
        setProfilo(profFallback)
        await loadDatiProfilo(profFallback.id)
      } else {
        setLoading(false)
      }
      return
    }

    setProfilo(prof)
    await loadDatiProfilo(prof.id)
  }

  async function loadDatiProfilo(profiloId: string) {
    // Carica pasti del giorno
    const { data: pastiData } = await supabase
      .from('pasti')
      .select('*')
      .eq('profilo_id', profiloId)
      .eq('data', selectedDate)
    setPasti(pastiData || [])

    // Carica pesate
    const { data: pesateData } = await supabase
      .from('pesate')
      .select('*')
      .eq('profilo_id', profiloId)
      .order('data', { ascending: false })
    setPesate(pesateData || [])

    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const totalKcal = pasti.reduce((acc, p) => acc + (Number(p.kcal) || 0), 0)
  const totalProt = pasti.reduce((acc, p) => acc + (Number(p.proteine_g) || 0), 0)
  const totalCarb = pasti.reduce((acc, p) => acc + (Number(p.carboidrati_g) || 0), 0)
  const totalGrass = pasti.reduce((acc, p) => acc + (Number(p.grassi_g) || 0), 0)

  const obiettivoKcal = profilo?.obiettivo_kcal_max || 2000
  const obiettivoProt = profilo?.obiettivo_proteine_min || 120
  const rimastiKcal = obiettivoKcal - totalKcal

  function changeDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  async function handleAddManualPasto(e: React.FormEvent) {
    e.preventDefault()
    if (!profilo) return

    await supabase.from('pasti').insert({
      profilo_id: profilo.id,
      data: selectedDate,
      tipo_pasto: tipoPastoInput,
      descrizione: descPastoInput || 'Pasto manuale',
      kcal: Number(kcalPastoInput) || 0,
      proteine_g: Number(protPastoInput) || 0,
      carboidrati_g: Number(carbPastoInput) || 0,
      grassi_g: Number(grassPastoInput) || 0,
      stimato: false
    })

    setShowAddPasto(false)
    setDescPastoInput('')
    setKcalPastoInput('')
    setProtPastoInput('')
    setCarbPastoInput('')
    setGrassPastoInput('')
    loadUserData()
  }

  async function handleChiudiGiornata() {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'chiudi giornata', data_corrente: selectedDate })
      })
      const data = await res.json()
      if (data.success) {
        alert(data.message)
        loadUserData()
      } else {
        alert(`Errore: ${data.error}`)
      }
    } catch (e: any) {
      alert(`Errore di rete: ${e.message}`)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex justify-center items-center">
        <p className="text-slate-400 animate-pulse text-sm">Caricamento diario in corso...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 pb-20 flex flex-col items-center">
      {profilo && !profilo.onboarding_completato && (
        <OnboardingModal profilo={profilo} onCompleted={() => loadUserData()} />
      )}

      <header className="w-full max-w-md bg-slate-800 p-4 shadow-md flex items-center justify-between sticky top-0 z-40 border-b border-slate-700">
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-700 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-lg text-slate-100">Diario Alimentare</h1>
          <p className="text-xs text-slate-400">{selectedDate}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-700 rounded-full transition">
            <ArrowRight className="w-5 h-5 text-slate-300" />
          </button>
          <button
            onClick={handleLogout}
            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Esci
          </button>
        </div>
      </header>

      <div className="w-full max-w-md p-4 flex-1">
        {!profilo ? (
          <div className="bg-slate-800 p-6 rounded-2xl text-center space-y-4 mt-10 border border-slate-700">
            <h2 className="text-xl font-bold text-amber-400">Nessun profilo trovato</h2>
            <p className="text-sm text-slate-300">
              Assicurati di aver effettuato l'accesso con un account valido collegato a un profilo.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'diario' && (
              <div className="space-y-6">
                <div className="bg-slate-800 p-5 rounded-2xl shadow-lg border border-slate-700 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Calorie</p>
                      <h2 className="text-2xl font-black text-emerald-400">{totalKcal} <span className="text-xs font-normal text-slate-400">/ {obiettivoKcal} kcal</span></h2>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Rimanenti</p>
                      <h3 className={`text-xl font-bold ${rimastiKcal < 0 ? 'text-rose-400' : 'text-sky-400'}`}>{rimastiKcal} kcal</h3>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-700">
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Proteine ({totalProt}g / {obiettivoProt}g)</span>
                        <span>{Math.round((totalProt / obiettivoProt) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-sky-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (totalProt / obiettivoProt) * 100)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Carboidrati ({totalCarb}g)</span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (totalCarb / 250) * 100)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Grassi ({totalGrass}g)</span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (totalGrass / 70) * 100)}%` }} />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleChiudiGiornata}
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Chiudi Giornata
                  </button>
                </div>

                {(['colazione', 'pranzo', 'cena', 'snack'] as const).map(tipo => {
                  const pastiTipo = pasti.filter(p => p.tipo_pasto === tipo)
                  const totKcalTipo = pastiTipo.reduce((acc, p) => acc + (Number(p.kcal) || 0), 0)

                  return (
                    <div key={tipo} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold capitalize text-slate-200 flex items-center gap-2">
                          <Flame className="w-4 h-4 text-amber-400" /> {tipo}
                        </h3>
                        <span className="text-sm font-semibold text-slate-400">{totKcalTipo} kcal</span>
                      </div>

                      <div className="space-y-2">
                        {pastiTipo.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">Nessun alimento registrato</p>
                        ) : (
                          pastiTipo.map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg text-sm">
                              <div>
                                <p className="font-medium text-slate-200">{p.descrizione}</p>
                                <p className="text-xs text-slate-400">P: {p.proteine_g}g | C: {p.carboidrati_g}g | G: {p.grassi_g}g</p>
                              </div>
                              <span className="font-semibold text-emerald-400">{p.kcal} kcal</span>
                            </div>
                          ))
                        )}
                      </div>

                      <button
                        onClick={() => { setTipoPastoInput(tipo); setShowAddPasto(true); }}
                        className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 pt-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Aggiungi voce
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'chat' && (
              <ChatTab profilo={profilo} selectedDate={selectedDate} onDataChanged={loadUserData} />
            )}

            {activeTab === 'peso' && (
              <div className="space-y-6">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
                  <h2 className="font-bold text-lg text-slate-200">Storico Pesate</h2>
                  <p className="text-xs text-slate-400">Registra il tuo peso scrivendo "peso 75.5" nella Chat AI.</p>
                  <div className="space-y-2">
                    {pesate.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Nessuna pesata registrata.</p>
                    ) : (
                      pesate.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-700/50">
                          <div>
                            <p className="font-bold text-slate-100 text-base">{p.peso_kg} kg</p>
                            <p className="text-xs text-slate-400">{p.data} {p.massa_grassa_pct ? `• Massa grassa: ${p.massa_grassa_pct}%` : ''}</p>
                          </div>
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full font-medium">{p.fonte || 'bilancia'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'statistiche' && (
              <div className="space-y-6">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
                  <h2 className="font-bold text-lg text-slate-200">Statistiche Nutrizionali</h2>
                  <p className="text-sm text-slate-400">Riepilogo avanzato dell'aderenza ai tuoi obiettivi e medie dei macronutrienti.</p>
                  <div className="bg-slate-900 p-4 rounded-xl space-y-2 text-xs text-slate-300">
                    <p>• Obiettivo calorico giornaliero: <span className="font-semibold text-emerald-400">{obiettivoKcal} kcal</span></p>
                    <p>• Obiettivo Proteine: <span className="font-semibold text-sky-400">{obiettivoProt} g</span></p>
                    <p>• Peso obiettivo: <span className="font-semibold text-amber-400">{profilo.peso_obiettivo_kg || '-'} kg</span></p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'impostazioni' && (
              <ImpostazioniTab profilo={profilo} onProfiloUpdated={loadUserData} />
            )}
          </>
        )}
      </div>

      {showAddPasto && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4 z-50">
          <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700 space-y-4">
            <h3 className="font-bold text-lg capitalize text-slate-100">Aggiungi {tipoPastoInput}</h3>
            <form onSubmit={handleAddManualPasto} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Descrizione</label>
                <input
                  type="text"
                  value={descPastoInput}
                  onChange={e => setDescPastoInput(e.target.value)}
                  placeholder="Es. Pollo e riso"
                  required
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400">Calorie (kcal)</label>
                  <input
                    type="number"
                    value={kcalPastoInput}
                    onChange={e => setKcalPastoInput(e.target.value)}
                    placeholder="Es. 450"
                    required
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Proteine (g)</label>
                  <input
                    type="number"
                    value={protPastoInput}
                    onChange={e => setProtPastoInput(e.target.value)}
                    placeholder="Es. 35"
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400">Carboidrati (g)</label>
                  <input
                    type="number"
                    value={carbPastoInput}
                    onChange={e => setCarbPastoInput(e.target.value)}
                    placeholder="Es. 50"
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Grassi (g)</label>
                  <input
                    type="number"
                    value={grassPastoInput}
                    onChange={e => setGrassPastoInput(e.target.value)}
                    placeholder="Es. 12"
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPasto(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 py-2.5 rounded-xl text-sm font-semibold text-slate-200 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl text-sm font-semibold text-white transition shadow"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="w-full max-w-md bg-slate-800 border-t border-slate-700 fixed bottom-0 grid grid-cols-5 py-2 px-1 z-40 shadow-lg">
        <button onClick={() => setActiveTab('diario')} className={`flex flex-col items-center py-1 transition ${activeTab === 'diario' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
          <Calendar className="w-5 h-5" /><span className="text-[10px] mt-1">Diario</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center py-1 transition ${activeTab === 'chat' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
          <MessageSquare className="w-5 h-5" /><span className="text-[10px] mt-1">Chat AI</span>
        </button>
        <button onClick={() => setActiveTab('peso')} className={`flex flex-col items-center py-1 transition ${activeTab === 'peso' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
          <Activity className="w-5 h-5" /><span className="text-[10px] mt-1">Peso</span>
        </button>
        <button onClick={() => setActiveTab('statistiche')} className={`flex flex-col items-center py-1 transition ${activeTab === 'statistiche' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
          <BarChart2 className="w-5 h-5" /><span className="text-[10px] mt-1">Statistiche</span>
        </button>
        <button onClick={() => setActiveTab('impostazioni')} className={`flex flex-col items-center py-1 transition ${activeTab === 'impostazioni' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
          <Settings className="w-5 h-5" /><span className="text-[10px] mt-1">Impostazioni</span>
        </button>
      </nav>
    </main>
  )
}
