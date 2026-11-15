'use client'

import { useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Flame, Lock, Mail, ArrowRight } from 'lucide-react'

export default function RegistratiPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (password.length < 10) {
      setError('La password deve essere di almeno 10 caratteri.')
      setLoading(false)
      return
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setSuccess('Registrazione completata! Controlla la tua email per confermare l\'account o accedi.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
            <Flame className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black">Crea Account</h1>
          <p className="text-xs text-slate-400">Inizia il tuo percorso con il Diario Alimentare AI</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Il tuo nome"
              required
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nome@esempio.it"
              required
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Password (min. 10 caratteri)</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {error && <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl">{error}</p>}
          {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-xl">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-sm transition shadow flex items-center justify-center gap-2"
          >
            {loading ? 'Registrazione in corso...' : 'Registrati'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-700">
          <p className="text-xs text-slate-400">
            Hai già un account?{' '}
            <a href="/login" className="text-emerald-400 hover:underline font-semibold">Accedi</a>
          </p>
        </div>
      </div>
    </main>
  )
}
