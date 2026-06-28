import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { generateFollowUpMessage } from '../utils/aiMessage'
import { FOLLOWUP_DAYS, getDueDay } from '../utils/automation'
import { safeRun } from '../utils/safeRun'
import { Mail, MessageCircle, Gift, Bell, Flag, PlayCircle, Loader2, CheckCircle } from 'lucide-react'

const stageInfo = {
  1: { label: 'Welcome Message', icon: MessageCircle },
  3: { label: 'Program Details', icon: Gift },
  5: { label: 'Success Stories', icon: Flag },
  7: { label: 'Reminder', icon: Bell },
  10: { label: 'Final Follow-Up', icon: Mail },
}

function AutomationWorkflow() {
  const [leads, setLeads] = useState([])
  const [logs, setLogs] = useState([])
  const [running, setRunning] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [selectedLead, setSelectedLead] = useState('')
  const [selectedDay, setSelectedDay] = useState(1)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const fetchData = async () => {
    const { data: leadData } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    setLeads(leadData || [])
    const { data: logData } = await supabase
      .from('follow_ups')
      .select('*, leads(name)')
      .order('sent_at', { ascending: false })
      .limit(15)
    setLogs(logData || [])
  }

  const sendFollowUp = async (lead, day) => {
    const message = await generateFollowUpMessage(lead, day)
    await supabase.from('follow_ups').insert([{ lead_id: lead.id, day_number: day, channel: 'WhatsApp', message }])
    await supabase.from('leads').update({ last_followup_day: day, status: 'Follow-Up' }).eq('id', lead.id)
  }

  const runAutomationCheck = async () => {
    await safeRun({
      setLoading: setRunning,
      setStatusMsg,
      action: async () => {
        let sentCount = 0
        let failCount = 0
        for (const lead of leads) {
          if (['Enrolled', 'Rejected'].includes(lead.status)) continue
          const dueDay = getDueDay(lead)
          if (dueDay) {
            try {
              await sendFollowUp(lead, dueDay)
              sentCount++
            } catch (err) {
              console.error(`Failed for ${lead.name}:`, err.message)
              failCount++
            }
          }
        }
        fetchData()
        if (sentCount === 0 && failCount === 0) return 'No leads due for follow-up right now.'
        return `✅ Sent ${sentCount} follow-up(s).${failCount > 0 ? ` ⚠️ ${failCount} failed — check console.` : ''}`
      }
    })
  }

  const sendManual = async () => {
    if (!selectedLead) return
    await safeRun({
      setLoading: setSending,
      setStatusMsg,
      action: async () => {
        const lead = leads.find((l) => l.id === selectedLead)
        await sendFollowUp(lead, selectedDay)
        fetchData()
        setToast('Success! Message sent.')
      },
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Enrollment Sequence</h1>
          <p className="text-sm text-gray-500">Automated Day 1 → Day 10 nurturing workflow</p>
        </div>
        <button onClick={runAutomationCheck} disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all disabled:opacity-60">
          {running ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />}
          {running ? 'Running...' : 'Run Follow-Up Check'}
        </button>
      </div>

      {statusMsg && <p className="text-sm text-primary font-medium mb-4">{statusMsg}</p>}

      <div className="grid grid-cols-5 gap-3 mb-8">
        {FOLLOWUP_DAYS.map((day) => {
          const Icon = stageInfo[day].icon
          return (
            <div key={day} className="bg-white/80 backdrop-blur-xl border border-white shadow-md rounded-2xl p-4 text-center">
              <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white mb-2">
                <Icon size={18} />
              </div>
              <p className="text-xs font-semibold text-gray-700">Day {day}</p>
              <p className="text-xs text-gray-400">{stageInfo[day].label}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5 mb-8">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Manual Test Trigger (for demo)</h3>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={selectedLead} onChange={(e) => setSelectedLead(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm outline-none">
            <option value="">Select a lead</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={selectedDay} onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm outline-none">
            {FOLLOWUP_DAYS.map((d) => <option key={d} value={d}>Day {d} – {stageInfo[d].label}</option>)}
          </select>
          <button onClick={sendManual} disabled={sending || !selectedLead}
            className="px-5 py-2.5 rounded-xl bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 transition-all disabled:opacity-50">
            {sending ? 'Sending...' : 'Send Now'}
          </button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-600 px-5 pt-4 pb-2">Recent Follow-Ups</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              <th className="px-5 py-2 font-medium">Lead</th>
              <th className="px-5 py-2 font-medium">Day</th>
              <th className="px-5 py-2 font-medium">Message</th>
              <th className="px-5 py-2 font-medium">Sent At</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan="4" className="text-center py-6 text-gray-400">No follow-ups sent yet.</td></tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-gray-100">
                <td className="px-5 py-3 font-medium text-gray-700">{log.leads?.name || '—'}</td>
                <td className="px-5 py-3 text-gray-600">Day {log.day_number}</td>
                <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{log.message}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{new Date(log.sent_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 transition-opacity">
          <CheckCircle size={18} />
          {toast}
        </div>
      )}
    </div>
  )
}

export default AutomationWorkflow