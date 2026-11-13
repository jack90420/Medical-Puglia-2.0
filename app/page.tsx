'use client'

import { useState, useEffect } from 'react'
import { Calendar, MessageSquare, Activity, BarChart2, Settings, Plus, Flame, ArrowLeft, ArrowRight, LogOut } from 'lucide-react'
import { createClient } from '@/app/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'diario' | 'chat' | 'peso' | 'statistiche' | 'impostazioni'>('diario')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [profilo, setProfilo] = useState<any>(null)
  const [pasti, setPasti] = useState<any[]>([])
  const [pesate, setPesate] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiSaved, setApiSaved] = useState(false)

  const [showAddPasto, setShowAddPasto] = useState(false)
  const [tipoPastoInput, setTipoPastoInput] = useState('pranzo')
  const [descPastoInput, setDescPastoInput] = useState('')
  const [kcalPastoInput, setKcalPastoInput] = useState('')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadUserData()
  }, [selectedDate])

  async function loadUserData() {
    setLoading(true)

    // Prendi direttamente il primo profilo disponibile nel database (es. il tuo profilo predefinito)
    const { data: prof, error: profError } = await supabase
      .from('profili')
      .select('*')
      .limit(1)
      .single()

    if (profError || !prof) {
      console.error('Errore caricamento profilo:', profError)
      setLoading(false)
      return
    }

    setProfilo(prof)

    // Carica pasti del giorno
    const { data: pastiData } = await supabase
      .from('pasti')
      .select('*')
      .eq('profilo_id', prof.id)
      .eq('data', selectedDate)
    setPasti(pastiData || [])

    // Carica pesate
    const { data: pesateData } = await supabase
      .from('pesate')
      .select('*')
      .eq('profilo_id', prof.id)
      .order('data', { ascending: false })
    setPesate(pesateData || [])

    // Carica messaggi chat
    const { data: chatData } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('profilo_id', prof.id)
      .eq('data', selectedDate)
      .order('created_at', { ascending: true })
    setChatMessages(chatData || [])

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
  const rimastiKcal = obiettivoKcal - totalKcal

  function changeDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  async function handleSendChat(textToSend?: string) {
    const text = textToSend || chatInput
    if (!text.trim()) return

    setChatInput('')
    setChatLoading(true)
    setChatMessages(prev => [...prev, { ruolo: 'user', contenuto: text, created_at: new Date().toISOString() }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, data_corrente: selectedDate })
      })
      const data = await res.json()
      if (data.success) {
        setChatMessages(prev => [...prev, { ruolo: 'assistant', contenuto: data.message, created_at: new Date().toISOString() }])
        loadUserData()
      } else {
        setChatMessages(prev => [...prev, { ruolo: 'assistant', contenuto: `Errore: ${data.error}`, created_at: new Date().toISOString() }])
      }
    } catch (e: any) {
      setChatMessages(prev => [...prev, { ruolo: 'assistant', contenuto: `Errore di rete: ${e.message}`, created_at: new Date().toISOString() }])
    }
    setChatLoading(false)
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
      stimato: false
    })

    setShowAddPasto(false)
    setDescPastoInput('')
    setKcalPastoInput('')
    loadUserData()
  }

  async function handleSaveApiKey(e: React.FormEvent) {
    e.preventDefault()
    if (!profilo || !apiKeyInput) return

    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profilo_id: profilo.id, provider: 'openrouter', api_key: apiKeyInput })
    })
    if (res.ok) {
      setApiSaved(true)
      setApiKeyInput('')
      setTimeout(() => setApiSaved(false), 3000)
    }
  }

  async function handleChiudiGiornata() {
    await handleSendChat('chiudi giornata')
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 pb-20 flex flex-col items-center">
      <header className="w-full max-w-md bg-slate-800 p-4 shadow-md flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-700 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-lg">Diario Alimentare</h1>
          <p className="text-xs text-slate-400">{selectedDate}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-700 rounded-full">
            <ArrowRight className="w-5 h-5" />
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
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-slate-400 animate-pulse">Caricamento dati...</p>
          </div>
        ) : !profilo ? (
          <div className="bg-slate-800 p-6 rounded-xl text-center space-y-4 mt-10">
            <h2 className="text-xl font-bold text-amber-400">Nessun profilo trovato</h2>
            <p className="text-sm text-slate-300">
              Assicurati che la tabella profili nel database contenga almeno un record.
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
                        <span>Proteine ({totalProt}g / {profilo.obiettivo_proteine_min || 120}g)</span>
                        <span>{Math.round((totalProt / (profilo.obiettivo_proteine_min || 120)) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-sky-500 h-full rounded-full" style={{ width: `${Math.min(100, (totalProt / (profilo.obiettivo_proteine_min || 120)) * 100)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Carboidrati ({totalCarb}g)</span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (totalCarb / 250) * 100)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Grassi ({totalGrass}g)</span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (totalGrass / 70) * 100)}%` }} />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleChiudiGiornata}
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-xl text-sm transition shadow"
                  >
                    Chiudi Giornata
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
              <div className="flex flex-col h-[75vh] justify-between space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  <button onClick={() => handleSendChat('Ho mangiato ')} className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-full border border-slate-700 whitespace-nowrap">🍎 Pasto</button>
                  <button onClick={() => handleSendChat('Peso oggi: ')} className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-full border border-slate-700 whitespace-nowrap">⚖️ Peso</button>
                  <button onClick={() => handleSendChat('chiudi giornata')} className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-full border border-slate-700 whitespace-nowrap">🔒 Chiudi</button>
                  <button onClick={() => handleSendChat('totale oggi')} className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-full border border-slate-700 whitespace-nowrap">📊 Check</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/80">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-slate-500 py-10 space-y-2">
                      <MessageSquare className="w-10 h-10 mx-auto opacity-40" />
                      <p className="text-sm">Scrivi cosa hai mangiato oggi.<br/>L'AI registrerà il pasto e calcolerà i macro!</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.ruolo === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.ruolo === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>
                          <p className="whitespace-pre-wrap">{msg.contenuto}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 text-slate-400 p-3 rounded-2xl text-sm animate-pulse border border-slate-700">
                        Sto calcolando kcal e macro...
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    placeholder="Es. 150g di pasta al pomodoro..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => handleSendChat()}
                    className="bg-emerald-600 hover:bg-emerald-500 px-5 rounded-xl font-semibold text-sm transition shadow"
                  >
                    Invia
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'peso' && (
              <div className="space-y-6">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
                  <h2 className="font-bold text-lg text-slate-200">Storico Pesate</h2>
                  <div className="space-y-2">
                    {pesate.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Nessuna pesata registrata. Scrivi "peso 75.5" in Chat AI!</p>
                    ) : (
                      pesate.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl">
                          <div>
                            <p className="font-bold text-slate-100">{p.peso_kg} kg</p>
                            <p className="text-xs text-slate-400">{p.data}</p>
                          </div>
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
                  <h2 className="font-bold text-lg text-slate-200">Statistiche</h2>
                  <p className="text-sm text-slate-400">Riepilogo e medie d'uso.</p>
                </div>
              </div>
            )}

            {activeTab === 'impostazioni' && (
              <div className="space-y-6">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
                  <h2 className="font-bold text-lg text-slate-200">Configurazione API AI</h2>
                  <form onSubmit={handleSaveApiKey} className="space-y-3">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={e => setApiKeyInput(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                    >
                      Salva Chiave API Cifrata
                    </button>
                    {apiSaved && <p className="text-xs text-emerald-400 text-center font-medium">Chiave salvata e cifrata!</p>}
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAddPasto && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-4 z-50">
          <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700 space-y-4">
            <h3 className="font-bold text-lg capitalize">Aggiungi {tipoPastoInput}</h3>
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
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPasto(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 py-2.5 rounded-xl text-sm font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl text-sm font-semibold text-white"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="w-full max-w-md bg-slate-800 border-t border-slate-700 fixed bottom-0 grid grid-cols-5 py-2 px-1 z-50 shadow-lg">
        <button onClick={() => setActiveTab('diario')} className={`flex flex-col items-center py-1 ${activeTab === 'diario' ? 'text-emerald-400' : 'text-slate-400'}`}>
          <Calendar className="w-5 h-5" /><span className="text-[10px] mt-1">Diario</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center py-1 ${activeTab === 'chat' ? 'text-emerald-400' : 'text-slate-400'}`}>
          <MessageSquare className="w-5 h-5" /><span className="text-[10px] mt-1">Chat AI</span>
        </button>
        <button onClick={() => setActiveTab('peso')} className={`flex flex-col items-center py-1 ${activeTab === 'peso' ? 'text-emerald-400' : 'text-slate-400'}`}>
          <Activity className="w-5 h-5" /><span className="text-[10px] mt-1">Peso</span>
        </button>
        <button onClick={() => setActiveTab('statistiche')} className={`flex flex-col items-center py-1 ${activeTab === 'statistiche' ? 'text-emerald-400' : 'text-slate-400'}`}>
          <BarChart2 className="w-5 h-5" /><span className="text-[10px] mt-1">Stat.</span>
        </button>
        <button onClick={() => setActiveTab('impostazioni')} className={`flex flex-col items-center py-1 ${activeTab === 'impostazioni' ? 'text-emerald-400' : 'text-slate-400'}`}>
          <Settings className="w-5 h-5" /><span className="text-[10px] mt-1">Setup</span>
        </button>
      </nav>
    </main>
  )
}
