import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { generateMessage } from '../utils/aiMessage'
import { MessageCircle, Mail, Phone, Sparkles, Copy, Check } from 'lucide-react'
import { safeRun } from '../utils/safeRun'

const channels = [
  { id: 'WhatsApp', icon: MessageCircle },
  { id: 'Email', icon: Mail },
  { id: 'SMS', icon: Phone },
]

function AIMessaging() {
  const [leads, setLeads] = useState([])
  const [selected, setSelected] = useState(null)
  const [channel, setChannel] = useState('WhatsApp')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { fetchLeads() }, [])

  const fetchLeads = async () => {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (!error) {
      setLeads(data)
      if (data.length > 0) setSelected(data[0])
    }
  }

  const handleGenerate = async () => {
  if (!selected) return
  await safeRun({
    setLoading,
    setStatusMsg: setError,
    action: async () => {
      setMessage('')
      const text = await generateMessage(selected, channel)
      setMessage(text)
    },
  })
}

  const handleCopy = () => {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex gap-6">
      <div className="w-72 bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-3 h-fit">
        <h2 className="text-sm font-semibold text-gray-500 px-2 mb-2">Select a Lead</h2>
        <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
          {leads.map((lead) => (
            <button key={lead.id} onClick={() => { setSelected(lead); setMessage(''); setError('') }}
              className={`text-left px-3 py-2 rounded-xl text-sm transition-all ${selected?.id === lead.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-50 text-gray-600'}`}>
              {lead.name || 'Unnamed Lead'}
            </button>
          ))}
          {leads.length === 0 && <p className="text-gray-400 text-sm px-2">No leads yet.</p>}
        </div>
      </div>

      <div className="flex-1 bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-8">
        {!selected ? (
          <p className="text-gray-400 text-center">Select a lead to generate a personalized message.</p>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">AI Messaging Hub</h1>
              <p className="text-sm text-gray-500">{selected.name} · {selected.course_interest || 'No course set'} · {selected.city || '—'}</p>
            </div>

            <div className="flex gap-2 mb-6">
              {channels.map(({ id, icon: Icon }) => (
                <button key={id} onClick={() => { setChannel(id); setMessage(''); setError('') }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${channel === id ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <Icon size={16} /> {id}
                </button>
              ))}
            </div>

            <button onClick={handleGenerate} disabled={loading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all disabled:opacity-60 mb-5">
              <Sparkles size={18} />
              {loading ? 'Generating...' : `Generate ${channel} Message`}
            </button>

            {error && <p className="text-red-500 text-sm mb-4">❌ {error}</p>}

            {message && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 relative">
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{message}</p>
                <button onClick={handleCopy}
                  className="absolute top-4 right-4 flex items-center gap-1 text-xs font-medium text-primary hover:text-accent transition-colors">
                  {copied ? <><Check size={14}/> Copied</> : <><Copy size={14}/> Copy</>}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AIMessaging