'use client'

import { useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('a.calora.98@gmail.com')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
    }

    setSuccess('Accesso effettuato! Reindirizzamento...')
    setTimeout(() => {
      router.push('/')
      router.refresh()
    }, 800)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
            <Flame className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black">Diario Alimentare AI</h1>
          <p className="text-xs text-slate-400">Inserisci email e password per entrare</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {error && <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl">{error}</p>}
          {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-xl">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-sm transition shadow"
          >
            {loading ? 'Accesso in corso...' : 'Entra nel Diario'}
          </button>
        </form>
      </div>
    </main>
  )
}
