import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { calculateScore, categoryColor } from '../utils/scoring'
import ScoreRing from '../components/ScoreRing'
import { Zap } from 'lucide-react'

function AIScoring() {
  const [leads, setLeads] = useState([])
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (!error) {
      setLeads(data)
      if (data.length > 0) selectLead(data[0])
    }
  }

  const selectLead = (lead) => {
    setSelected(lead)
    setResult(calculateScore(lead))
  }

  const saveScore = async () => {
    if (!selected || !result) return
    setSaving(true)
    await supabase.from('leads').update({ score: result.total }).eq('id', selected.id)
    setSaving(false)
    fetchLeads()
  }

  const colors = result ? categoryColor(result.category) : categoryColor('Cold')

  return (
    <div className="flex gap-6">
      {/* Lead list */}
      <div className="w-72 bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-3 h-fit">
        <h2 className="text-sm font-semibold text-gray-500 px-2 mb-2">All Leads</h2>
        <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
          {leads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => selectLead(lead)}
              className={`text-left px-3 py-2 rounded-xl text-sm transition-all ${
                selected?.id === lead.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              {lead.name || 'Unnamed Lead'}
            </button>
          ))}
          {leads.length === 0 && <p className="text-gray-400 text-sm px-2">No leads yet.</p>}
        </div>
      </div>

      {/* Score panel */}
      <div className="flex-1 bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-8">
        {!selected ? (
          <p className="text-gray-400 text-center">Select a lead to view AI scoring.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Lead Scoring Intelligence</h1>
                <p className="text-sm text-gray-500">{selected.name} · {selected.email}</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${colors.bg} ${colors.text}`}>
                {result.category.toUpperCase()} LEAD
              </span>
            </div>

            <div className="flex items-center gap-10 mb-8">
              <ScoreRing score={result.total} color={colors.ring} />
              <div className="flex-1 space-y-3">
                <ScoreBar label="Interest Score" value={result.interestScore} max={20} />
                <ScoreBar label="Education Score" value={result.educationScore} max={45} />
                <ScoreBar label="Engagement Score" value={result.engagementScore} max={35} />
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-500 mb-3">Matched Rules</h3>
            <div className="space-y-2 mb-6">
              {result.breakdown.length === 0 && (
                <p className="text-gray-400 text-sm">No scoring rules matched yet.</p>
              )}
              {result.breakdown.map((rule, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 px-4 py-2.5 rounded-xl text-sm">
                  <span className="text-gray-600">{rule.label}</span>
                  <span className="font-semibold text-primary">+{rule.points}</span>
                </div>
              ))}
            </div>

            <button
              onClick={saveScore}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all disabled:opacity-60"
            >
              <Zap size={18} />
              {saving ? 'Saving...' : 'Calculate & Save Score'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ScoreBar({ label, value, max }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default AIScoring