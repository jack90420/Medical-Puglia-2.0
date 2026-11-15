'use client'

import { useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { Key, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react'

export default function ImpostazioniTab({ profilo, onProfiloUpdated }: { profilo: any, onProfiloUpdated: () => void }) {
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [modelInput, setModelInput] = useState(profilo?.modello_preferito || 'anthropic/claude-3.5-sonnet')
  const [apiSaved, setApiSaved] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const supabase = createClient()

  async function handleSaveApiKey(e: React.FormEvent) {
    e.preventDefault()
    if (!profilo || !apiKeyInput) return

    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profilo_id: profilo.id, provider: 'openrouter', api_key: apiKeyInput, modello_preferito: modelInput })
    })
    if (res.ok) {
      setApiSaved(true)
      setApiKeyInput('')
      setTimeout(() => setApiSaved(false), 3000)
    }
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'ciao, test connessione', data_corrente: new Date().toISOString().split('T')[0] })
      })
      const data = await res.json()
      if (res.ok) {
        setTestResult('Connessione riuscita! L\'AI ha risposto correttamente.')
      } else {
        setTestResult(`Errore: ${data.error}`)
      }
    } catch (e: any) {
      setTestResult(`Errore di rete: ${e.message}`)
    }
    setTesting(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-lg text-slate-200">Configurazione AI & OpenRouter</h2>
        </div>
        <p className="text-xs text-slate-400">
          Collega la tua chiave OpenRouter per abilitare le stime nutrizionali intelligenti via chat. La chiave viene cifrata con AES-256-GCM sul server.
        </p>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 space-y-2">
          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> Guida rapida OpenRouter
          </p>
          <ol className="text-xs text-slate-300 list-decimal list-inside space-y-1">
            <li>Vai su <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="text-sky-400 underline inline-flex items-center gap-0.5">OpenRouter.ai <ExternalLink className="w-3 h-3" /></a> e crea un account gratuito.</li>
            <li>Genera una chiave API nella sezione Keys.</li>
            <li>Incollala qui sotto e salva.</li>
          </ol>
        </div>

        <form onSubmit={handleSaveApiKey} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Chiave API OpenRouter (sk-or-v1-...)</label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="sk-or-v1-..."
              required
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Modello Preferito</label>
            <select
              value={modelInput}
              onChange={e => setModelInput(e.target.value)}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Consigliato)</option>
              <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Veloce / Gratuito)</option>
              <option value="openai/gpt-4o">GPT-4o</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow"
          >
            Salva Chiave API Cifrata
          </button>
          {apiSaved && <p className="text-xs text-emerald-400 text-center font-medium flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4" /> Chiave salvata e cifrata con successo!</p>}
        </form>

        <div className="pt-2 border-t border-slate-700">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2.5 rounded-xl text-sm transition"
          >
            {testing ? 'Test in corso...' : 'Prova Connessione AI'}
          </button>
          {testResult && (
            <p className={`text-xs p-3 rounded-xl mt-2 ${testResult.includes('riuscita') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {testResult}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
