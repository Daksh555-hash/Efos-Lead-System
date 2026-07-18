import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCounselor } from '../components/CounselorProtectedRoute'
import { createBrandedDoc, addTable, saveDoc } from '../utils/pdfExport'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Users, Flame, CalendarCheck, TrendingUp,
  Search, X, ChevronDown, ChevronUp,
  StickyNote, ArrowRightLeft, Clock,
  Send, Phone, Mail, MessageCircle,
  Download, PhoneCall, PhoneOff, PhoneMissed, CalendarPlus,
  AlertTriangle
} from 'lucide-react'
import ExportMenu from '../components/ExportMenu'
import { exportToCSV, exportToExcel } from '../utils/dataExport'

// ── Helper: Relative time ──
function timeAgo(dateStr) {
  if (!dateStr) return 'Never'
  const now = new Date()
  const past = new Date(dateStr)
  const diffMs = now - past
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return past.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
}

// ── Helper: Days since ──
function daysSince(dateStr) {
  if (!dateStr) return 999
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
}

// ── Status Badge Colors ──
const statusColors = {
  'New': 'bg-blue-100 text-blue-700',
  'Contacted': 'bg-cyan-100 text-cyan-700',
  'Interested': 'bg-purple-100 text-purple-700',
  'Follow-Up': 'bg-amber-100 text-amber-700',
  'Qualified': 'bg-green-100 text-green-700',
  'Enrolled': 'bg-emerald-100 text-emerald-800',
  'Rejected': 'bg-red-100 text-red-700',
}
const ALL_STATUSES = ['New', 'Contacted', 'Interested', 'Follow-Up', 'Qualified', 'Enrolled', 'Rejected']

// ── Filter Tab Config ──
const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'hot', label: 'Hot 🔥' },
  { key: 'follow-up', label: 'Follow-Up' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'enrolled', label: 'Enrolled' },
]

// ── Call Log Options ──
const CALL_LOG_OPTIONS = [
  { label: 'No Answer', icon: PhoneMissed, color: 'bg-red-50 text-red-600 hover:bg-red-100', value: 'No Answer' },
  { label: 'Interested', icon: PhoneCall, color: 'bg-green-50 text-green-600 hover:bg-green-100', value: 'Interested' },
  { label: 'Call Back Tomorrow', icon: CalendarPlus, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100', value: 'Call Back Tomorrow' },
  { label: 'Not Interested', icon: PhoneOff, color: 'bg-gray-50 text-gray-600 hover:bg-gray-100', value: 'Not Interested' },
]

function CounselorDashboard() {
  const counselor = useCounselor()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortDir, setSortDir] = useState('desc')
  const [activeFilter, setActiveFilter] = useState('all')

  // Action Modal State
  const [selectedLead, setSelectedLead] = useState(null)
  const [modalTab, setModalTab] = useState('details')
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [loggingCall, setLoggingCall] = useState(false)

  useEffect(() => {
    if (counselor) fetchMyLeads()
  }, [counselor])

  const fetchMyLeads = async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('counselor_id', counselor.id)
      .order('score', { ascending: false })

    if (!error) setLeads(data || [])
    setLoading(false)
  }

  // ── KPI Calculations ──
  const activeLeads = leads.filter(l => !['Enrolled', 'Rejected'].includes(l.status))
  const hotLeads = leads.filter(l => l.score >= 80 && !['Enrolled', 'Rejected', 'Contacted'].includes(l.status))
  const followUpsDue = leads.filter(l => l.status === 'Follow-Up')
  const enrolledCount = leads.filter(l => l.status === 'Enrolled').length
  const conversionRate = leads.length > 0 ? ((enrolledCount / leads.length) * 100).toFixed(1) : '0.0'

  // ── Today's Follow-Ups (overdue = last contacted > 2 days ago) ──
  const todayFollowUps = leads
    .filter(l => l.status === 'Follow-Up' || (l.status === 'Interested' && daysSince(l.last_contacted) >= 2))
    .sort((a, b) => daysSince(b.last_contacted || b.created_at) - daysSince(a.last_contacted || a.created_at))

  // ── Weekly Performance Chart Data ──
  const getWeeklyData = () => {
    const data = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayStr = date.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' })
      const dateStr = date.toISOString().split('T')[0]

      const contacted = leads.filter(l => {
        if (!l.last_contacted) return false
        return l.last_contacted.split('T')[0] === dateStr
      }).length

      const enrolled = leads.filter(l => {
        if (!l.last_contacted || l.status !== 'Enrolled') return false
        return l.last_contacted.split('T')[0] === dateStr
      }).length

      data.push({ day: dayStr, contacted, enrolled })
    }
    return data
  }

  // ── Filtered & Sorted Leads ──
  const filteredLeads = leads
    .filter(l => {
      // Apply tab filter
      if (activeFilter === 'hot') return l.score >= 80 && !['Enrolled', 'Rejected'].includes(l.status)
      if (activeFilter === 'follow-up') return l.status === 'Follow-Up'
      if (activeFilter === 'new') return l.status === 'New'
      if (activeFilter === 'contacted') return l.status === 'Contacted'
      if (activeFilter === 'enrolled') return l.status === 'Enrolled'
      return true
    })
    .filter(l => {
      // Apply search
      if (!searchTerm) return true
      const term = searchTerm.toLowerCase()
      return (
        l.name?.toLowerCase().includes(term) ||
        l.course_interest?.toLowerCase().includes(term) ||
        l.status?.toLowerCase().includes(term) ||
        l.email?.toLowerCase().includes(term)
      )
    })
    .sort((a, b) => sortDir === 'desc' ? (b.score || 0) - (a.score || 0) : (a.score || 0) - (b.score || 0))

  // ── Tab Counts ──
  const tabCounts = {
    all: leads.length,
    hot: leads.filter(l => l.score >= 80 && !['Enrolled', 'Rejected'].includes(l.status)).length,
    'follow-up': leads.filter(l => l.status === 'Follow-Up').length,
    new: leads.filter(l => l.status === 'New').length,
    contacted: leads.filter(l => l.status === 'Contacted').length,
    enrolled: leads.filter(l => l.status === 'Enrolled').length,
  }

  // ── Actions ──
  const handleStatusUpdate = async (leadId, newStatus) => {
    setUpdatingStatus(true)
    await supabase
      .from('leads')
      .update({ status: newStatus, last_contacted: new Date().toISOString() })
      .eq('id', leadId)

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, last_contacted: new Date().toISOString() } : l))
    setSelectedLead(prev => prev ? { ...prev, status: newStatus, last_contacted: new Date().toISOString() } : null)
    setUpdatingStatus(false)
  }

  const handleSaveNote = async () => {
    if (!newNote.trim() || !selectedLead) return
    setSavingNote(true)

    const existingNotes = selectedLead.notes || ''
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    const updatedNotes = `[${timestamp}] ${newNote.trim()}\n${existingNotes}`

    await supabase
      .from('leads')
      .update({ notes: updatedNotes, last_contacted: new Date().toISOString() })
      .eq('id', selectedLead.id)

    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes: updatedNotes, last_contacted: new Date().toISOString() } : l))
    setSelectedLead(prev => ({ ...prev, notes: updatedNotes, last_contacted: new Date().toISOString() }))
    setNewNote('')
    setSavingNote(false)
  }

  // ── Call Log Handler ──
  const handleCallLog = async (lead, callResult) => {
    setLoggingCall(true)
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    const existingNotes = lead.notes || ''
    const callNote = `[📞 CALL LOG - ${timestamp}] ${callResult}`
    const updatedNotes = `${callNote}\n${existingNotes}`

    const updates = {
      notes: updatedNotes,
      last_contacted: new Date().toISOString(),
      call_status: callResult,
    }

    // Auto-update status based on call result
    if (callResult === 'Interested') updates.status = 'Interested'
    if (callResult === 'Call Back Tomorrow') updates.status = 'Follow-Up'

    await supabase.from('leads').update(updates).eq('id', lead.id)

    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, ...updates } : l))
    setSelectedLead(prev => prev ? { ...prev, ...updates } : null)
    setLoggingCall(false)
  }

  // ── PDF Export ──
  const handleExportPDF = () => {
    const doc = createBrandedDoc(
      `${counselor?.name}'s Lead Report`,
      `${leads.length} lead(s) assigned · Generated on ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      'landscape'
    )
    addTable(
      doc,
      ['Name', 'Email', 'Phone', 'Course', 'Status', 'Score', 'Last Contact', 'Call Status'],
      leads.map(l => [
        l.name || '-',
        l.email || '-',
        l.phone || '-',
        l.course_interest || '-',
        l.status || 'New',
        String(l.score || 0),
        l.last_contacted ? new Date(l.last_contacted).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never',
        l.call_status || '-',
      ]),
      44
    )
    saveDoc(doc, `EFOS_Counselor_Report_${counselor?.name?.replace(/\s/g, '_')}_${Date.now()}.pdf`)
  }
    const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Course', 'Status', 'Score', 'Last Contact', 'Call Status']
    const rows = leads.map(l => [
        l.name || '-', l.email || '-', l.phone || '-', l.course_interest || '-',
        l.status || 'New', String(l.score || 0),
        l.last_contacted ? new Date(l.last_contacted).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never',
        l.call_status || '-',
    ])
    exportToCSV(headers, rows, `EFOS_Counselor_Report_${counselor?.name?.replace(/\s/g, '_')}_${Date.now()}.csv`)
  }

  const handleExportExcel = () => {
    const headers = ['Name', 'Email', 'Phone', 'Course', 'Status', 'Score', 'Last Contact', 'Call Status']
    const rows = leads.map(l => [
        l.name || '-', l.email || '-', l.phone || '-', l.course_interest || '-',
        l.status || 'New', String(l.score || 0),
        l.last_contacted ? new Date(l.last_contacted).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never',
        l.call_status || '-',
    ])
    exportToExcel([{ name: 'Assigned Leads', headers, rows }], `EFOS_Counselor_Report_${counselor?.name?.replace(/\s/g, '_')}_${Date.now()}.xlsx`)
  }

  // ── Greeting ──
  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ==================== GREETING + EXPORT ==================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {greeting()}, {counselor?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here's your lead pipeline for today · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}
          </p>
        </div>
        <ExportMenu 
          onPDF={handleExportPDF} 
          onCSV={handleExportCSV} 
          onExcel={handleExportExcel} 
        />
      </div>

      {/* ==================== KPI CARDS ==================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Active Pipeline" value={activeLeads.length} icon={Users} gradient="from-indigo-500 to-indigo-600" subtitle={`${leads.length} total assigned`} />
        <KPICard label="Hot Leads 🔥" value={hotLeads.length} icon={Flame} gradient="from-red-500 to-orange-500" subtitle="Score 80+ pending" highlight={hotLeads.length > 0} />
        <KPICard label="Follow-ups Due" value={followUpsDue.length} icon={CalendarCheck} gradient="from-amber-500 to-yellow-500" subtitle="Need attention today" />
        <KPICard label="Conversion Rate" value={`${conversionRate}%`} icon={TrendingUp} gradient="from-green-500 to-emerald-600" subtitle={`${enrolledCount} enrolled`} />
      </div>

      {/* ==================== TODAY'S FOLLOW-UPS + WEEKLY CHART ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Today's Follow-Ups */}
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CalendarCheck size={16} className="text-amber-500" />
            Today's Follow-Ups
            {todayFollowUps.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {todayFollowUps.length}
              </span>
            )}
          </h3>

          {todayFollowUps.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">🎉 All caught up! No follow-ups pending.</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {todayFollowUps.map(lead => {
                const days = daysSince(lead.last_contacted || lead.created_at)
                const isOverdue = days >= 3
                return (
                  <div
                    key={lead.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm cursor-pointer transition-all hover:shadow-md ${
                      isOverdue ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-100'
                    }`}
                    onClick={() => { setSelectedLead(lead); setModalTab('call') }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {lead.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{lead.name}</p>
                        <p className="text-xs text-gray-400">{lead.course_interest || '—'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {isOverdue ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                          <AlertTriangle size={12} /> {days}d overdue
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">{days}d ago</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Weekly Performance Chart */}
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-green-500" />
            This Week's Activity
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={getWeeklyData()} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="contacted" fill="#4F46E5" name="Contacted" radius={[4, 4, 0, 0]} />
              <Bar dataKey="enrolled" fill="#10B981" name="Enrolled" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ==================== FILTER TABS ==================== */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeFilter === tab.key
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-white/80 text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
              activeFilter === tab.key ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* ==================== LEAD TABLE ==================== */}
      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl overflow-hidden">

        {/* Table Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Your Assigned Leads
            <span className="text-gray-400 font-normal ml-2">({filteredLeads.length})</span>
          </h3>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, course, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder-gray-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 text-left text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Student Name</th>
                <th className="px-5 py-3 font-medium">Course Interest</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium cursor-pointer select-none" onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}>
                  <span className="flex items-center gap-1">
                    Lead Score
                    {sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </span>
                </th>
                <th className="px-5 py-3 font-medium">Last Action</th>
                <th className="px-5 py-3 font-medium">Quick Actions</th>
                <th className="px-5 py-3 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400">
                    {searchTerm ? 'No leads match your search.' : 'No leads in this category.'}
                  </td>
                </tr>
              )}
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-t border-gray-100 hover:bg-indigo-50/30 transition-colors">
                  {/* Name */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {lead.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{lead.name}</p>
                        <p className="text-xs text-gray-400">{lead.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Course */}
                  <td className="px-5 py-3.5 text-gray-600">{lead.course_interest || '—'}</td>

                  {/* Status Badge */}
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[lead.status] || 'bg-gray-100 text-gray-600'}`}>
                      {lead.status || 'New'}
                    </span>
                  </td>

                  {/* Score with visual bar */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${lead.score >= 80 ? 'text-red-500' : lead.score >= 50 ? 'text-amber-500' : 'text-blue-500'}`}>
                        {lead.score || 0}
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${lead.score >= 80 ? 'bg-red-500' : lead.score >= 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(lead.score || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Last Action */}
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      {timeAgo(lead.last_contacted || lead.created_at)}
                    </span>
                  </td>

                  {/* Quick Action Buttons */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {lead.phone && (
                        <>
                          <a
                            href={`https://wa.me/91${lead.phone.replace(/\D/g, '').slice(-10)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all"
                            title="WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                          <a
                            href={`tel:${lead.phone}`}
                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"
                            title="Call"
                          >
                            <Phone size={14} />
                          </a>
                        </>
                      )}
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-500 hover:text-white transition-all"
                          title="Email"
                        >
                          <Mail size={14} />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* View Details */}
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => { setSelectedLead(lead); setModalTab('details') }}
                      className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary hover:text-white transition-all"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== ACTION MODAL (Slide-Over) ==================== */}
      {selectedLead && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedLead(null)}
          />

          <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-[slideIn_0.3s_ease-out]">

            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-primary to-accent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                  {selectedLead.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{selectedLead.name}</h3>
                  <p className="text-white/70 text-xs">{selectedLead.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Quick actions in header */}
                {selectedLead.phone && (
                  <a
                    href={`https://wa.me/91${selectedLead.phone.replace(/\D/g, '').slice(-10)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    title="WhatsApp"
                  >
                    <MessageCircle size={15} />
                  </a>
                )}
                <button
                  onClick={() => setSelectedLead(null)}
                  className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {[
                { key: 'details', label: 'Details', icon: Users },
                { key: 'call', label: 'Call Log', icon: PhoneCall },
                { key: 'notes', label: 'Notes', icon: StickyNote },
                { key: 'timeline', label: 'Timeline', icon: Clock },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setModalTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                    modalTab === tab.key
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* ── DETAILS TAB ── */}
              {modalTab === 'details' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Phone" value={selectedLead.phone || '—'} />
                    <InfoItem label="City" value={selectedLead.city || '—'} />
                    <InfoItem label="Age" value={selectedLead.age || '—'} />
                    <InfoItem label="Qualification" value={selectedLead.qualification || '—'} />
                    <InfoItem label="Course Interest" value={selectedLead.course_interest || '—'} />
                    <InfoItem label="Source" value={selectedLead.source || '—'} />
                    <InfoItem label="Lead Score" value={selectedLead.score || 0} highlight />
                    <InfoItem label="Brochure" value={selectedLead.downloaded_brochure ? 'Yes ✅' : 'No'} />
                  </div>
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Last Call Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      selectedLead.call_status === 'Interested' ? 'bg-green-100 text-green-700' :
                      selectedLead.call_status === 'No Answer' ? 'bg-red-100 text-red-700' :
                      selectedLead.call_status === 'Call Back Tomorrow' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedLead.call_status || 'No calls yet'}
                    </span>
                  </div>
                </div>
              )}

              {/* ── CALL LOG TAB ── */}
              {modalTab === 'call' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-3">Log your call result:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {CALL_LOG_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleCallLog(selectedLead, opt.value)}
                          disabled={loggingCall}
                          className={`flex items-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium border border-transparent transition-all disabled:opacity-50 ${opt.color}`}
                        >
                          <opt.icon size={16} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {loggingCall && <p className="text-xs text-primary mt-2 animate-pulse">Saving call log...</p>}
                  </div>

                  {/* Call History */}
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-medium text-gray-500 mb-3">Call History</p>
                    {selectedLead.notes ? (
                      <div className="space-y-2">
                        {selectedLead.notes.split('\n').filter(n => n.includes('📞 CALL LOG')).map((note, i) => (
                          <div key={i} className="px-4 py-3 rounded-xl bg-blue-50 text-sm text-gray-700 border border-blue-100">
                            {note}
                          </div>
                        ))}
                        {!selectedLead.notes.includes('📞 CALL LOG') && (
                          <p className="text-sm text-gray-400">No call logs recorded yet.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No call logs recorded yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── NOTES TAB ── */}
              {modalTab === 'notes' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Add Internal Note</label>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="e.g., Called student, parents asked about hostel fees, call back tomorrow..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none placeholder-gray-400 transition-all"
                    />
                    <button
                      onClick={handleSaveNote}
                      disabled={savingNote || !newNote.trim()}
                      className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      <Send size={14} />
                      {savingNote ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-medium text-gray-500 mb-3">All Notes & Call Logs</p>
                    {selectedLead.notes ? (
                      <div className="space-y-2">
                        {selectedLead.notes.split('\n').filter(Boolean).map((note, i) => (
                          <div key={i} className={`px-4 py-3 rounded-xl text-sm text-gray-700 border ${
                            note.includes('📞 CALL LOG') ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
                          }`}>
                            {note}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No notes recorded yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── TIMELINE TAB ── */}
              {modalTab === 'timeline' && (
                <div className="space-y-0">
                  <TimelineItem title="Lead Created" subtitle="Form submitted via website" time={selectedLead.created_at} color="bg-blue-500" />
                  {selectedLead.counselor_id && (
                    <TimelineItem title="Assigned to You" subtitle={`Assigned to ${counselor?.name}`} time={selectedLead.created_at} color="bg-purple-500" />
                  )}
                  {selectedLead.call_status && (
                    <TimelineItem title={`Call: ${selectedLead.call_status}`} subtitle="Phone call logged" time={selectedLead.last_contacted} color="bg-cyan-500" />
                  )}
                  {selectedLead.last_contacted && (
                    <TimelineItem title="Last Contacted" subtitle={`Status: ${selectedLead.status}`} time={selectedLead.last_contacted} color="bg-green-500" />
                  )}
                  {selectedLead.status === 'Enrolled' && (
                    <TimelineItem title="Successfully Enrolled 🎉" subtitle="Student has been enrolled" time={selectedLead.last_contacted} color="bg-emerald-500" isLast />
                  )}
                </div>
              )}
            </div>

            {/* ── BOTTOM: Pipeline Mover ── */}
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                <ArrowRightLeft size={12} className="inline mr-1" />
                Update Pipeline Stage
              </label>
              <select
                value={selectedLead.status || 'New'}
                onChange={(e) => handleStatusUpdate(selectedLead.id, e.target.value)}
                disabled={updatingStatus}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {updatingStatus && <p className="text-xs text-primary mt-1 animate-pulse">Updating...</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub-Components ──

function KPICard({ label, value, icon: Icon, gradient, subtitle, highlight }) {
  return (
    <div className={`bg-white/80 backdrop-blur-xl border shadow-lg rounded-2xl p-5 transition-all hover:shadow-xl ${
      highlight ? 'border-red-200 ring-2 ring-red-100 animate-pulse' : 'border-white'
    }`}>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-3`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
      {subtitle && <p className="text-[10px] text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}

function InfoItem({ label, value, highlight }) {
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-primary' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}

function TimelineItem({ title, subtitle, time, color, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${color} shrink-0 mt-1`} />
        {!isLast && <div className="w-px h-full bg-gray-200 my-1" />}
      </div>
      <div className="pb-5">
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
        {time && <p className="text-[10px] text-gray-400 mt-1">{timeAgo(time)}</p>}
      </div>
    </div>
  )
}

export default CounselorDashboard