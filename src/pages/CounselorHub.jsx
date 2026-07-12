import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { pickCounselor } from '../utils/counselorAssignment'
import { categoryColor } from '../utils/scoring'
import { safeRun } from '../utils/safeRun'
import { createBrandedDoc, addSectionTitle, addTable, saveDoc } from '../utils/pdfExport'
import { UserCheck, Zap, Flame, Loader2, Phone, Mail, Download } from 'lucide-react'

const statusStyles = {
  Active: 'bg-green-100 text-green-700',
  'On Leave': 'bg-amber-100 text-amber-700',
  Inactive: 'bg-gray-200 text-gray-600',
}
const STATUSES = ['Active', 'On Leave', 'Inactive']

function CounselorHub() {
  const [leads, setLeads] = useState([])
  const [counselors, setCounselors] = useState([])
  const [assigning, setAssigning] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: leadData } = await supabase.from('leads').select('*').order('score', { ascending: false })
    const { data: counselorData } = await supabase.from('counselors').select('*').order('name')
    setLeads(leadData || [])
    setCounselors(counselorData || [])
  }

  const updateCounselorStatus = async (id, newStatus) => {
    await supabase.from('counselors').update({ status: newStatus }).eq('id', id)
    fetchData()
  }

  const hotUnassigned = leads.filter(
    (l) => l.score > 80 && !l.counselor_id && !['Enrolled', 'Rejected'].includes(l.status)
  )
  const assignedLeads = leads.filter((l) => l.counselor_id)

  const activeCounselors = counselors.filter((c) => (c.status || 'Active') === 'Active')
  const onLeaveCounselors = counselors.filter((c) => c.status === 'On Leave')
  const inactiveCounselors = counselors.filter((c) => c.status === 'Inactive')

  const counselorName = (id) => counselors.find((c) => c.id === id)?.name || 'Unknown'
  const leadCountFor = (counselorId) => assignedLeads.filter((l) => l.counselor_id === counselorId).length

  const runAutoAssign = async () => {
    await safeRun({
      setLoading: setAssigning,
      setStatusMsg,
      action: async () => {
        if (activeCounselors.length === 0) {
          return '⚠️ No Active counselors available. Set at least one counselor to Active first.'
        }
        let working = [...assignedLeads]
        let count = 0
        let failed = 0

        for (const lead of hotUnassigned) {
          try {
            const counselor = pickCounselor(activeCounselors, working)
            if (!counselor) throw new Error('No active counselors found.')
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
        return `✅ Assigned ${count} hot lead(s) to Active counselors.${failed > 0 ? ` ⚠️ ${failed} failed — check console.` : ''}`
      }
    })
  }

  const handleExport = async () => {
    await safeRun({
      setLoading: setExporting,
      setStatusMsg,
      action: async () => {
        const doc = createBrandedDoc('Counselor Report', `${counselors.length} counselor(s)`)
        let y = addSectionTitle(doc, 'Counselor Directory', 44)
        y = addTable(
          doc,
          ['Name', 'Email', 'Phone', 'Department', 'Status', 'Leads Assigned'],
          counselors.map((c) => [
            c.name || '-',
            c.email || '-',
            c.phone || '-',
            c.specialization || '-',
            c.status || 'Active',
            String(leadCountFor(c.id)),
          ]),
          y
        )
        y = addSectionTitle(doc, 'Assigned Leads', y)
        addTable(
          doc,
          ['Lead', 'Priority', 'Counselor', 'Status'],
          assignedLeads.map((lead) => [
            lead.name || '-',
            lead.score > 70 ? 'HOT' : lead.score > 40 ? 'WARM' : 'COLD',
            counselorName(lead.counselor_id),
            lead.status || '-',
          ]),
          y
        )
        saveDoc(doc, `EFOS_Counselor_Report_${Date.now()}.pdf`)
        return '✅ Export downloaded.'
      },
    })
  }

  const CounselorCard = ({ c }) => (
    <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold shrink-0">
          {c.name?.[0] || '?'}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{c.name}</p>
          <p className="text-xs text-gray-400 truncate">{c.specialization || 'No department set'}</p>
        </div>
      </div>
      <div className="space-y-1 mb-3">
        {c.email && <p className="flex items-center gap-1.5 text-xs text-gray-500 truncate"><Mail size={12} /> {c.email}</p>}
        {c.phone && <p className="flex items-center gap-1.5 text-xs text-gray-500 truncate"><Phone size={12} /> {c.phone}</p>}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <UserCheck size={14} className="text-primary" />
          {leadCountFor(c.id)} leads assigned
        </div>
        <select
          value={c.status || 'Active'}
          onChange={(e) => updateCounselorStatus(c.id, e.target.value)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 outline-none cursor-pointer ${statusStyles[c.status] || statusStyles.Active}`}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Counselor Assignment</h1>
          <p className="text-sm text-gray-500">Auto-routes leads scoring above 80 to Active counselors</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 shadow-sm transition-all disabled:opacity-60">
            <Download size={16} /> {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button onClick={runAutoAssign} disabled={assigning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all disabled:opacity-60">
            {assigning ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
            {assigning ? 'Assigning...' : 'Auto-Assign Hot Leads'}
          </button>
        </div>
      </div>

      {statusMsg && <p className="text-sm text-primary font-medium mb-4">{statusMsg}</p>}

      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5 mb-8">
        <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
          <Flame size={16} className="text-red-500" /> Hot Leads Awaiting Assignment ({hotUnassigned.length})
        </h3>
        {hotUnassigned.length === 0 ? (
          <p className="text-gray-400 text-sm">No unassigned hot leads right now. Score a lead above 80 in AI Scoring first.</p>
        ) : (
          <div className="space-y-2">
            {hotUnassigned.map((lead) => (
              <div key={lead.id} className="flex flex-wrap justify-between items-center gap-2 bg-red-50 px-4 py-2.5 rounded-xl text-sm">
                <span className="font-medium text-gray-700">{lead.name}</span>
                <span className="text-gray-500">{lead.course_interest || '—'}</span>
                <span className="font-semibold text-red-500">Score: {lead.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" /> Active ({activeCounselors.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {activeCounselors.length === 0 && <p className="text-gray-400 text-sm">No active counselors.</p>}
        {activeCounselors.map((c) => <CounselorCard key={c.id} c={c} />)}
      </div>

      <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500" /> On Leave ({onLeaveCounselors.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {onLeaveCounselors.length === 0 && <p className="text-gray-400 text-sm">No counselors on leave.</p>}
        {onLeaveCounselors.map((c) => <CounselorCard key={c.id} c={c} />)}
      </div>

      <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gray-400" /> Inactive ({inactiveCounselors.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {inactiveCounselors.length === 0 && <p className="text-gray-400 text-sm">No inactive counselors.</p>}
        {inactiveCounselors.map((c) => <CounselorCard key={c.id} c={c} />)}
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-600 px-5 pt-4 pb-2">Assigned Leads</h3>
        <div className="overflow-x-auto">
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
    </div>
  )
}

export default CounselorHub