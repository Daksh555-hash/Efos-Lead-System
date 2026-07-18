import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Search } from 'lucide-react'
import { createBrandedDoc, addTable, saveDoc } from '../utils/pdfExport'
import { exportToCSV, exportToExcel } from '../utils/exportData'
import ExportMenu from '../components/ExportMenu'

const statusStyles = {
  New: 'bg-gray-100 text-gray-600',
  Contacted: 'bg-blue-100 text-blue-600',
  Interested: 'bg-cyan-100 text-cyan-600',
  'Follow-Up': 'bg-amber-100 text-amber-600',
  Qualified: 'bg-purple-100 text-purple-600',
  Enrolled: 'bg-green-100 text-green-600',
  Rejected: 'bg-red-100 text-red-600',
}

const ALL_STATUSES = ['New', 'Contacted', 'Interested', 'Follow-Up', 'Qualified', 'Enrolled', 'Rejected']

const scoreColor = (score) => {
  if (score > 70) return 'text-red-500'
  if (score > 40) return 'text-amber-500'
  return 'text-blue-500'
}

function LeadManagement() {
  const [leads, setLeads] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setLeads(data)
    setLoading(false)
  }

  const updateStatus = async (leadId, newStatus) => {
    await supabase.from('leads').update({ status: newStatus }).eq('id', leadId)
    fetchLeads()
  }

  const filtered = leads.filter((lead) => {
    const matchesSearch = lead.name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const exportHeaders = ['Name', 'Email', 'Course', 'City', 'Status', 'Score']
  const exportRows = () => filtered.map((l) => [
    l.name || '-', l.email || '-', l.course_interest || '-', l.city || '-', l.status || 'New', String(l.score ?? 0),
  ])

  const handleExportPDF = () => {
    const doc = createBrandedDoc('Lead Management Report', `${filtered.length} lead(s) — filter: ${statusFilter}`)
    addTable(doc, exportHeaders, exportRows(), 44)
    saveDoc(doc, `EFOS_Lead_Management_${Date.now()}.pdf`)
  }
  const handleExportCSV = () => exportToCSV(exportHeaders, exportRows(), `EFOS_Lead_Management_${Date.now()}.csv`)
  const handleExportExcel = () => exportToExcel([{ name: 'Leads', headers: exportHeaders, rows: exportRows() }], `EFOS_Lead_Management_${Date.now()}.xlsx`)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lead Inventory</h1>
          <p className="text-sm text-gray-500">{filtered.length} leads found</p>
        </div>
        <ExportMenu onPDF={handleExportPDF} onCSV={handleExportCSV} onExcel={handleExportExcel} />
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All</option>
          {ALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-5 py-3 font-medium">City</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="5" className="text-center py-8 text-gray-400">Loading leads...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan="5" className="text-center py-8 text-gray-400">No leads found.</td></tr>
              )}
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-t border-gray-100 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-800 capitalize">{lead.name}</div>
                    <div className="text-gray-400 text-xs">{lead.email}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{lead.course_interest || '-'}</td>
                  <td className="px-5 py-3 text-gray-600">{lead.city || '-'}</td>
                  <td className="px-5 py-3">
                    <select
                      value={lead.status || 'New'}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border-0 outline-none cursor-pointer ${statusStyles[lead.status] || statusStyles.New}`}
                    >
                      {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className={`px-5 py-3 font-semibold ${scoreColor(lead.score)}`}>{lead.score ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default LeadManagement