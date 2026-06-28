import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { pickCounselor } from '../utils/counselorAssignment'
import { categoryColor } from '../utils/scoring'
import { UserCheck, Zap, Flame, Loader2 } from 'lucide-react'
import { safeRun } from '../utils/safeRun'

function CounselorHub() {
  const [leads, setLeads] = useState([])
  const [counselors, setCounselors] = useState([])
  const [assigning, setAssigning] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: leadData } = await supabase.from('leads').select('*').order('score', { ascending: false })
    const { data: counselorData } = await supabase.from('counselors').select('*')
    setLeads(leadData || [])
    setCounselors(counselorData || [])
  }

  const hotUnassigned = leads.filter(
    (l) => l.score > 80 && !l.counselor_id && !['Enrolled', 'Rejected'].includes(l.status)
  )
  const assignedLeads = leads.filter((l) => l.counselor_id)

  const counselorName = (id) => counselors.find((c) => c.id === id)?.name || 'Unknown'
  const leadCountFor = (counselorId) => assignedLeads.filter((l) => l.counselor_id === counselorId).length

  const runAutoAssign = async () => {
  await safeRun({
    setLoading: setAssigning,
    setStatusMsg,
    action: async () => {
      let working = [...assignedLeads]
      let count = 0
      let failed = 0

      for (const lead of hotUnassigned) {
        try {
          const counselor = pickCounselor(counselors, working)
          if (!counselor) throw new Error('No counselors found in database.')
          const { error } = await supabase
            .from('leads')
            .update({ counselor_id: counselor.id, status: 'Qualified' })
            .eq('id', lead.id)
          if (error) throw error
          working.push({ counselor_id: counselor.id })
          count++
        } catch (err) {
          console.error(`Failed to assign ${lead.name}:`, err.message)
          failed++
        }
      }

      fetchData()
      if (count === 0 && failed === 0) return 'No unassigned hot leads right now.'
      return `✅ Assigned ${count} hot lead(s).${failed > 0 ? ` ⚠️ ${failed} failed — check console.` : ''}`
    }
  })
}
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Counselor Assignment</h1>
          <p className="text-sm text-gray-500">Auto-routes leads scoring above 80 to your team</p>
        </div>
        <button onClick={runAutoAssign} disabled={assigning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all disabled:opacity-60">
          {assigning ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
          {assigning ? 'Assigning...' : 'Auto-Assign Hot Leads'}
        </button>
      </div>

      {statusMsg && <p className="text-sm text-primary font-medium mb-4">{statusMsg}</p>}

      {/* Hot leads waiting */}
      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5 mb-8">
        <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
          <Flame size={16} className="text-red-500" /> Hot Leads Awaiting Assignment ({hotUnassigned.length})
        </h3>
        {hotUnassigned.length === 0 ? (
          <p className="text-gray-400 text-sm">No unassigned hot leads right now. Score a lead above 80 in AI Scoring first.</p>
        ) : (
          <div className="space-y-2">
            {hotUnassigned.map((lead) => (
              <div key={lead.id} className="flex justify-between items-center bg-red-50 px-4 py-2.5 rounded-xl text-sm">
                <span className="font-medium text-gray-700">{lead.name}</span>
                <span className="text-gray-500">{lead.course_interest || '—'}</span>
                <span className="font-semibold text-red-500">Score: {lead.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Counselor cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {counselors.map((c) => (
          <div key={c.id} className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                {c.name?.[0] || '?'}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                <p className="text-xs text-gray-400">{c.specialization}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <UserCheck size={14} className="text-primary" />
              {leadCountFor(c.id)} leads assigned
            </div>
          </div>
        ))}
      </div>

      {/* Assigned leads table */}
      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-600 px-5 pt-4 pb-2">Assigned Leads</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              <th className="px-5 py-2 font-medium">Lead</th>
              <th className="px-5 py-2 font-medium">Priority</th>
              <th className="px-5 py-2 font-medium">Counselor</th>
              <th className="px-5 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {assignedLeads.length === 0 && (
              <tr><td colSpan="4" className="text-center py-6 text-gray-400">No leads assigned yet.</td></tr>
            )}
            {assignedLeads.map((lead) => {
              const colors = categoryColor(lead.score > 70 ? 'Hot' : lead.score > 40 ? 'Warm' : 'Cold')
              return (
                <tr key={lead.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-medium text-gray-700">{lead.name}</td>
                  <td className="px-5 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                      {lead.score > 70 ? 'HOT' : lead.score > 40 ? 'WARM' : 'COLD'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{counselorName(lead.counselor_id)}</td>
                  <td className="px-5 py-3 text-gray-500">{lead.status}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CounselorHub