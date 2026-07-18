import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { generateFollowUpMessage } from '../utils/aiMessage'
import { FOLLOWUP_DAYS, getDueDay } from '../utils/automation'
import { safeRun } from '../utils/safeRun'
import { sendTelegramWithOptionalFile } from '../utils/telegram'
import { sendEmail } from '../utils/email'
import { createBrandedDoc, addTable, saveDoc } from '../utils/pdfExport'
import { exportToCSV, exportToExcel } from '../utils/exportData'
import ExportMenu from '../components/ExportMenu'
import { Mail, MessageCircle, Gift, Bell, Flag, PlayCircle, Loader2, CheckCircle, Send, Phone, Globe, Paperclip, X } from 'lucide-react'

const stageInfo = {
  1: { label: 'Welcome Message', icon: MessageCircle },
  3: { label: 'Program Details', icon: Gift },
  5: { label: 'Success Stories', icon: Flag },
  7: { label: 'Reminder', icon: Bell },
  10: { label: 'Final Follow-Up', icon: Mail },
}

const CHANNEL_OPTIONS = [
  { id: 'WhatsApp', icon: MessageCircle },
  { id: 'SMS', icon: Phone },
  { id: 'Telegram', icon: Send },
  { id: 'Email', icon: Mail },
  { id: 'All', icon: Globe },
]

const ALL_SUB_CHANNELS = ['WhatsApp', 'SMS', 'Telegram', 'Email']

function AutomationWorkflow() {
  const [leads, setLeads] = useState([])
  const [logs, setLogs] = useState([])
  const [running, setRunning] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [selectedLead, setSelectedLead] = useState('')
  const [selectedDay, setSelectedDay] = useState(1)
  const [sending, setSending] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState('')
  const [channel, setChannel] = useState('WhatsApp')
  const [chatIdInput, setChatIdInput] = useState('')
  const [attachEnabled, setAttachEnabled] = useState(false)
  const [file, setFile] = useState(null)

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const lead = leads.find((l) => l.id === selectedLead)
    setChatIdInput(lead?.telegram_chat_id || '')
  }, [selectedLead, leads])

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

  const saveChatId = async () => {
    if (!selectedLead) return
    await supabase.from('leads').update({ telegram_chat_id: chatIdInput || null }).eq('id', selectedLead)
    fetchData()
  }

  const deliverMessage = async (lead, channelName, day, fileToSend) => {
    const message = await generateFollowUpMessage(lead, day, channelName)

    if (channelName === 'Telegram') {
      await sendTelegramWithOptionalFile(lead.telegram_chat_id, message, fileToSend)
    } else if (channelName === 'Email') {
      await sendEmail({ toEmail: lead.email, toName: lead.name, subject: 'A message from EFOS', message, file: fileToSend })
    }

    await supabase.from('follow_ups').insert([{ lead_id: lead.id, day_number: day, channel: channelName, message }])
    await supabase.from('leads').update({ last_followup_day: day, status: 'Follow-Up' }).eq('id', lead.id)
  }

  const deliverToLead = async (lead, day, channelName, fileToSend) => {
    if (channelName === 'All') {
      const outcomes = []
      for (const sub of ALL_SUB_CHANNELS) {
        try {
          await deliverMessage(lead, sub, day, fileToSend)
          outcomes.push(`${sub} ✅`)
        } catch (err) {
          outcomes.push(`${sub} ⚠️ ${err.message}`)
        }
      }
      return outcomes
    }
    await deliverMessage(lead, channelName, day, fileToSend)
    return [`${channelName} ✅`]
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
              await deliverToLead(lead, dueDay, channel, attachEnabled ? file : null)
              sentCount++
            } catch (err) {
              console.error(`Failed for ${lead.name}:`, err.message)
              failCount++
            }
          }
        }
        fetchData()
        if (sentCount === 0 && failCount === 0) return 'No leads due for follow-up right now.'
        return `✅ Sent ${sentCount} follow-up(s) via ${channel}.${failCount > 0 ? ` ⚠️ ${failCount} failed — check console.` : ''}`
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
        const outcomes = await deliverToLead(lead, selectedDay, channel, attachEnabled ? file : null)
        fetchData()
        setToast('Success! Message sent.')
        return outcomes.join('  ·  ')
      },
    })
  }

  const fetchExportData = async () => {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*, leads(name)')
      .order('sent_at', { ascending: false })
    if (error) throw error
    const headers = ['Lead', 'Day', 'Channel', 'Message', 'Sent At']
    const rows = data.map((log) => [
      log.leads?.name || '-',
      `Day ${log.day_number}`,
      log.channel || '-',
      log.message || '-',
      new Date(log.sent_at).toLocaleString(),
    ])
    return { headers, rows, count: data.length }
  }

  const handleExportPDF = async () => {
    await safeRun({
      setLoading: setExporting,
      setStatusMsg,
      action: async () => {
        const { headers, rows, count } = await fetchExportData()
        const doc = createBrandedDoc('Automation Follow-Up Report', `${count} follow-up(s) sent`)
        addTable(doc, headers, rows.map((r) => [r[0], r[1], r[2], String(r[3]).slice(0, 90), r[4]]), 44)
        saveDoc(doc, `EFOS_Automation_Report_${Date.now()}.pdf`)
        return '✅ PDF downloaded.'
      },
    })
  }

  const handleExportCSV = async () => {
    await safeRun({
      setLoading: setExporting,
      setStatusMsg,
      action: async () => {
        const { headers, rows } = await fetchExportData()
        exportToCSV(headers, rows, `EFOS_Automation_Report_${Date.now()}.csv`)
        return '✅ CSV downloaded.'
      },
    })
  }

  const handleExportExcel = async () => {
    await safeRun({
      setLoading: setExporting,
      setStatusMsg,
      action: async () => {
        const { headers, rows } = await fetchExportData()
        exportToExcel([{ name: 'Follow-Ups', headers, rows }], `EFOS_Automation_Report_${Date.now()}.xlsx`)
        return '✅ Excel file downloaded.'
      },
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Enrollment Sequence</h1>
          <p className="text-sm text-gray-500">Automated Day 1 → Day 10 nurturing workflow</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportMenu onPDF={handleExportPDF} onCSV={handleExportCSV} onExcel={handleExportExcel} loading={exporting} />
          <button onClick={runAutomationCheck} disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all disabled:opacity-60">
            {running ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />}
            {running ? 'Running...' : `Run Follow-Up Check (${channel})`}
          </button>
        </div>
      </div>

      {statusMsg && <p className="text-sm text-primary font-medium mb-4">{statusMsg}</p>}

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-8">
        {FOLLOWUP_DAYS.map((day) => {
          const Icon = stageInfo[day].icon
          return (
            <div key={day} className="bg-white/80 backdrop-blur-xl border border-white shadow-md rounded-2xl p-2 sm:p-4 text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white mb-2">
                <Icon size={16} />
              </div>
              <p className="text-xs font-semibold text-gray-700">Day {day}</p>
              <p className="text-xs text-gray-400">{stageInfo[day].label}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5 mb-8">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Send Follow-Up Message</h3>

        <div className="flex flex-wrap gap-2 mb-3">
          {CHANNEL_OPTIONS.map(({ id, icon: Icon }) => (
            <button key={id} onClick={() => setChannel(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${channel === id ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Icon size={16} /> {id}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 mb-4">
          {channel === 'WhatsApp' || channel === 'SMS'
            ? `${channel} messages are AI-generated and logged, but not actually delivered — real ${channel} sending needs a paid business API.`
            : channel === 'All'
            ? 'Telegram & Email are delivered for real. WhatsApp & SMS are generated and logged only.'
            : `Messages on ${channel} are delivered for real.`}
        </p>

        {(channel === 'Telegram' || channel === 'All') && (
          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm outline-none"
              placeholder="Telegram Chat ID for this lead (they must have messaged your bot first)"
              value={chatIdInput}
              onChange={(e) => setChatIdInput(e.target.value)}
            />
            <button onClick={saveChatId} className="px-4 py-2.5 rounded-xl bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 transition-all">
              Save ID
            </button>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <input type="checkbox" checked={attachEnabled} onChange={(e) => setAttachEnabled(e.target.checked)} className="w-4 h-4 accent-primary" />
          Attach a photo or PDF with this message
        </label>
        {attachEnabled && (
          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm cursor-pointer hover:bg-gray-200 transition-all">
              <Paperclip size={16} />
              {file ? file.name : 'Choose file'}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
            </label>
            {file && (
              <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500">
                <X size={16} />
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center">
          <select value={selectedLead} onChange={(e) => setSelectedLead(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm outline-none">
            <option value="">Select a lead</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={selectedDay} onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm outline-none">
            {FOLLOWUP_DAYS.map((d) => <option key={d} value={d}>Day {d} – {stageInfo[d].label}</option>)}
          </select>
          <button onClick={sendManual} disabled={sending || !selectedLead}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 transition-all disabled:opacity-50">
            {sending ? 'Sending...' : 'Send Now'}
          </button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-600 px-5 pt-4 pb-2">Recent Follow-Ups</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-5 py-2 font-medium">Lead</th>
                <th className="px-5 py-2 font-medium">Day</th>
                <th className="px-5 py-2 font-medium">Channel</th>
                <th className="px-5 py-2 font-medium">Message</th>
                <th className="px-5 py-2 font-medium">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan="5" className="text-center py-6 text-gray-400">No follow-ups sent yet.</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-medium text-gray-700">{log.leads?.name || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">Day {log.day_number}</td>
                  <td className="px-5 py-3 text-gray-600">{log.channel}</td>
                  <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{log.message}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{new Date(log.sent_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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