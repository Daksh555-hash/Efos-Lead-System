import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { pickCounselor } from '../utils/counselorAssignment'
import { categoryColor } from '../utils/scoring'
import { safeRun } from '../utils/safeRun'
import { createBrandedDoc, addSectionTitle, addTable, saveDoc } from '../utils/pdfExport'
import ExportMenu from '../components/ExportMenu'
import { exportMultiSectionCSV, exportToExcel } from '../utils/dataExport'
import { UserCheck, Zap, Flame, Loader2, Phone, Mail, Hand, CheckSquare, Square, MessageSquare, Send } from 'lucide-react'

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

  // Manual assignment state
  const [manualOpen, setManualOpen] = useState(false)
  const [manualLeadIds, setManualLeadIds] = useState([])
  const [manualCounselor, setManualCounselor] = useState('')
  const [manualAssigning, setManualAssigning] = useState(false)
  const [viewingNotes, setViewingNotes] = useState(null)

  // Messaging state
  const [msgOpen, setMsgOpen] = useState(false)
  const [msgTarget, setMsgTarget] = useState('all')
  const [msgText, setMsgText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

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

  const hotUnassigned = leads.filter((l) => l.score > 80 && !l.counselor_id && !['Enrolled', 'Rejected'].includes(l.status))
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
        if (activeCounselors.length === 0) return '⚠️ No Active counselors available. Set at least one counselor to Active first.'
        let working = [...assignedLeads]
        let count = 0
        let failed = 0

        for (const lead of hotUnassigned) {
          try {
            const counselor = pickCounselor(activeCounselors, working)
            if (!counselor) throw new Error('No active counselors found.')
            const { error } = await supabase.from('leads').update({ counselor_id: counselor.id, status: 'Qualified' }).eq('id', lead.id)
            if (error) throw error
            await supabase.from('messages').insert([{ counselor_id: counselor.id, sender_name: 'System', message: `New hot lead auto-assigned: ${lead.name}` }])
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

  const toggleManualLead = (id) => setManualLeadIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const selectAllManual = () => setManualLeadIds(hotUnassigned.map((l) => l.id))
  const clearAllManual = () => setManualLeadIds([])

  const handleManualAssign = async () => {
    if (manualLeadIds.length === 0 || !manualCounselor) return
    await safeRun({
      setLoading: setManualAssigning,
      setStatusMsg,
      action: async () => {
        let count = 0
        let failed = 0
        for (const leadId of manualLeadIds) {
          try {
            const { error } = await supabase.from('leads').update({ counselor_id: manualCounselor, status: 'Qualified' }).eq('id', leadId)
            if (error) throw error
            const leadName = leads.find(l => l.id === leadId)?.name || 'a student'
            await supabase.from('messages').insert([{ counselor_id: manualCounselor, sender_name: 'Admin', message: `New lead assigned to you: ${leadName}` }])
            count++
          } catch (err) {
            console.error(`Failed to assign lead ${leadId}:`, err.message)
            failed++
          }
        }
        const cName = counselorName(manualCounselor)
        setManualLeadIds([])
        setManualCounselor('')
        fetchData()
        return `✅ Assigned ${count} lead(s) to ${cName}.${failed > 0 ? ` ⚠️ ${failed} failed — check console.` : ''}`
      },
    })
  }

  const handleExportPDF = async () => {
    await safeRun({
      setLoading: setExporting,
      setStatusMsg,
      action: async () => {
        const doc = createBrandedDoc('Counselor Report', `${counselors.length} counselor(s)`)
        let y = addSectionTitle(doc, 'Counselor Directory', 44)
        y = addTable(doc, ['Name', 'Email', 'Phone', 'Department', 'Status', 'Leads Assigned'], counselors.map((c) => [c.name || '-', c.email || '-', c.phone || '-', c.specialization || '-', c.status || 'Active', String(leadCountFor(c.id))]), y)
        y = addSectionTitle(doc, 'Assigned Leads', y)
        addTable(doc, ['Lead', 'Priority', 'Counselor', 'Status'], assignedLeads.map((lead) => [lead.name || '-', lead.score > 70 ? 'HOT' : lead.score > 40 ? 'WARM' : 'COLD', counselorName(lead.counselor_id), lead.status || '-']), y)
        saveDoc(doc, `EFOS_Counselor_Report_${Date.now()}.pdf`)
        return '✅ Export downloaded.'
      },
    })
  }

  const handleExportCSV = () => {
    const sections = [
      {
        title: 'Counselor Directory',
        headers: ['Name', 'Email', 'Phone', 'Department', 'Status', 'Leads Assigned'],
        rows: counselors.map(c => [c.name, c.email, c.phone, c.specialization, c.status, leadCountFor(c.id)])
      },
      {
        title: 'Assigned Leads',
        headers: ['Lead', 'Priority', 'Counselor', 'Status'],
        rows: assignedLeads.map(l => [l.name, l.score > 70 ? 'HOT' : 'COLD', counselorName(l.counselor_id), l.status])
      }
    ]
    exportMultiSectionCSV(sections, `EFOS_Admin_Report_${Date.now()}.csv`)
  }

  const handleExportExcel = () => {
    const sheets = [
      {
        name: 'Counselors',
        headers: ['Name', 'Email', 'Phone', 'Department', 'Status', 'Leads Assigned'],
        rows: counselors.map(c => [c.name, c.email, c.phone, c.specialization, c.status, leadCountFor(c.id)])
      },
      {
        name: 'Assigned Leads',
        headers: ['Lead', 'Priority', 'Counselor', 'Status'],
        rows: assignedLeads.map(l => [l.name, l.score > 70 ? 'HOT' : 'COLD', counselorName(l.counselor_id), l.status])
      }
    ]
    exportToExcel(sheets, `EFOS_Admin_Report_${Date.now()}.xlsx`)
  }

  const handleSendMessage = async () => {
    if (!msgText.trim()) return
    await safeRun({
      setLoading: setSendingMsg,
      setStatusMsg,
      action: async () => {
        const payload = {
          counselor_id: msgTarget === 'all' ? null : msgTarget,
          sender_name: 'Admin / Staff',
          message: msgText.trim()
        }
        const { error } = await supabase.from('messages').insert([payload])
        if (error) throw error
        setMsgText('')
        setMsgOpen(false)
        return '✅ Message sent successfully to ' + (msgTarget === 'all' ? 'All Counselors' : counselorName(msgTarget))
      }
    })
  }

  const CounselorCard = ({ c }) => (
    <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold shrink-0">{c.name?.[0] || '?'}</div>
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
          <UserCheck size={14} className="text-primary" /> {leadCountFor(c.id)} leads assigned
        </div>
        <select value={c.status || 'Active'} onChange={(e) => updateCounselorStatus(c.id, e.target.value)} className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 outline-none cursor-pointer ${statusStyles[c.status] || statusStyles.Active}`}>
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
          <ExportMenu onPDF={handleExportPDF} onCSV={handleExportCSV} onExcel={handleExportExcel} loading={exporting} />
          
          <button onClick={() => setMsgOpen(!msgOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all ${
              msgOpen ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            <MessageSquare size={16} /> Message Counselors
          </button>
          
          <button onClick={() => setManualOpen(!manualOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all ${
              manualOpen ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            <Hand size={16} /> Manually Assign Hot Lead
          </button>
          
          <button onClick={runAutoAssign} disabled={assigning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all disabled:opacity-60">
            {assigning ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
            {assigning ? 'Assigning...' : 'Auto-Assign'}
          </button>
        </div>
      </div>

      {statusMsg && <p className="text-sm text-primary font-medium mb-4">{statusMsg}</p>}

      {msgOpen && (
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5 mb-8 animate-[slideIn_0.2s_ease-out]">
          <h3 className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" /> Send Real-Time Notification
          </h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">To:</label>
              <select value={msgTarget} onChange={(e) => setMsgTarget(e.target.value)} className="w-full sm:w-72 px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:bg-white focus:border-primary transition-colors">
                <option value="all">Broadcast to ALL Counselors</option>
                {counselors.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status || 'Active'})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Message:</label>
              <textarea value={msgText} onChange={(e) => setMsgText(e.target.value)} placeholder="Type an update or instruction here..." rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 focus:bg-white focus:border-primary transition-colors resize-none" />
            </div>
            <div className="flex justify-end">
              <button onClick={handleSendMessage} disabled={sendingMsg || !msgText.trim()} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all shadow-md disabled:opacity-50">
                {sendingMsg ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sendingMsg ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {manualOpen && (
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5 mb-8">
          <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2"><Hand size={16} className="text-gray-500" /> Manually Assign Hot Lead(s)</h3>
          <p className="text-xs text-gray-400 mb-4">Select as many leads as you like, then pick one counselor to assign them all to.</p>
          {hotUnassigned.length === 0 ? (
            <p className="text-sm text-amber-600">No unassigned hot leads available right now.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">{manualLeadIds.length} of {hotUnassigned.length} selected</span>
                <div className="flex gap-3">
                  <button onClick={selectAllManual} className="text-xs font-medium text-primary hover:text-accent">Select All</button>
                  <button onClick={clearAllManual} className="text-xs font-medium text-gray-400 hover:text-gray-600">Clear</button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl max-h-56 overflow-y-auto mb-4 divide-y divide-gray-100">
                {hotUnassigned.map((lead) => {
                  const checked = manualLeadIds.includes(lead.id)
                  return (
                    <label key={lead.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
                      <input type="checkbox" checked={checked} onChange={() => toggleManualLead(lead.id)} className="w-4 h-4 accent-primary shrink-0"/>
                      {checked ? <CheckSquare size={14} className="text-primary shrink-0" /> : <Square size={14} className="text-gray-300 shrink-0" />}
                      <span className="flex-1 text-sm font-medium text-gray-700 truncate">{lead.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{lead.course_interest || '—'}</span>
                      <span className="text-xs font-semibold text-red-500 shrink-0">Score: {lead.score}</span>
                    </label>
                  )
                })}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <select value={manualCounselor} onChange={(e) => setManualCounselor(e.target.value)} className="w-full sm:flex-1 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm outline-none">
                  <option value="">Select a counselor</option>
                  {counselors.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.status || 'Active'})</option>)}
                </select>
                <button onClick={handleManualAssign} disabled={manualAssigning || manualLeadIds.length === 0 || !manualCounselor} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 transition-all disabled:opacity-50 whitespace-nowrap">
                  {manualAssigning ? 'Assigning...' : `Assign ${manualLeadIds.length || ''} Lead${manualLeadIds.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5 mb-8">
        <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2"><Flame size={16} className="text-red-500" /> Hot Leads Awaiting ({hotUnassigned.length})</h3>
        {hotUnassigned.length === 0 ? (
          <p className="text-gray-400 text-sm">No unassigned hot leads right now.</p>
        ) : (
          <div className="space-y-2">
            {hotUnassigned.map((lead) => (
              <div key={lead.id} className="flex flex-wrap justify-between items-center gap-2 bg-red-50 px-4 py-2.5 rounded-xl text-sm">
                <span className="font-medium text-gray-700">{lead.name}</span>
                <span className="font-semibold text-red-500">Score: {lead.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {activeCounselors.map((c) => <CounselorCard key={c.id} c={c} />)}
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
                <th className="px-5 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {assignedLeads.length === 0 && <tr><td colSpan="5" className="text-center py-6 text-gray-400">No leads assigned.</td></tr>}
              {assignedLeads.map((lead) => {
                const colors = categoryColor(lead.score > 70 ? 'Hot' : lead.score > 40 ? 'Warm' : 'Cold')
                return (
                  <tr key={lead.id} className="border-t border-gray-100">
                    <td className="px-5 py-3 font-medium text-gray-700">{lead.name}</td>
                    <td className="px-5 py-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>{lead.score > 70 ? 'HOT' : lead.score > 40 ? 'WARM' : 'COLD'}</span></td>
                    <td className="px-5 py-3 text-gray-600">{counselorName(lead.counselor_id)}</td>
                    <td className="px-5 py-3 text-gray-500">{lead.status}</td>
                    <td className="px-5 py-3">
                      {lead.notes ? <button onClick={() => setViewingNotes(lead)} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary hover:text-white transition-all">View Notes</button> : <span className="text-xs text-gray-400">No notes</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {viewingNotes && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setViewingNotes(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary to-accent">
              <div><h3 className="text-white font-semibold">{viewingNotes.name}</h3></div>
              <button onClick={() => setViewingNotes(null)} className="text-white hover:bg-white/30 p-1 rounded-lg">✕</button>
            </div>
            <div className="px-6 py-5 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {viewingNotes.notes.split('\n').filter(Boolean).map((note, i) => (
                  <div key={i} className="px-4 py-3 rounded-xl bg-gray-50 text-sm text-gray-700 border border-gray-100">{note}</div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default CounselorHub