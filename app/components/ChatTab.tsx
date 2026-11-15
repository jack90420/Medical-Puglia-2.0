'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Flame, Mic, MicOff, Send } from 'lucide-react'

export default function ChatTab({ profilo, selectedDate, onDataChanged }: { profilo: any, selectedDate: string, onDataChanged: () => void }) {
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadChatMessages()
  }, [selectedDate])

  async function loadChatMessages() {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('profilo_id', profilo.id)
      .eq('data', selectedDate)
      .order('created_at', { ascending: true })
    setChatMessages(data || [])
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
        onDataChanged()
      } else {
        setChatMessages(prev => [...prev, { ruolo: 'assistant', contenuto: `Errore: ${data.error}`, created_at: new Date().toISOString() }])
      }
    } catch (e: any) {
      setChatMessages(prev => [...prev, { ruolo: 'assistant', contenuto: `Errore di rete: ${e.message}`, created_at: new Date().toISOString() }])
    }
    setChatLoading(false)
  }

  function startVoiceRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Riconoscimento vocale non supportato da questo browser. Usa la dettatura da tastiera.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'it-IT'
    recognition.interimResults = true

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setChatInput(transcript)
    }

    recognition.start()
  }

  return (
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
            <Flame className="w-10 h-10 mx-auto opacity-40 text-amber-400" />
            <p className="text-sm">Scrivi o detta cosa hai mangiato.<br/>L'AI registrerà il pasto e calcolerà i macro!</p>
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
              Sto elaborando la tua richiesta...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={startVoiceRecognition}
          className={`p-3 rounded-xl border transition ${isListening ? 'bg-rose-600 text-white border-rose-500 animate-pulse' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
          title="Detta con il microfono"
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendChat()}
          placeholder={isListening ? 'In ascolto...' : 'Es. 150g di pasta al pomodoro...'}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={() => handleSendChat()}
          className="bg-emerald-600 hover:bg-emerald-500 p-3 rounded-xl font-semibold text-white transition shadow"
          title="Invia"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
