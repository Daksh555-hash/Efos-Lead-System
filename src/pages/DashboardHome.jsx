import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { computeKPIs, monthlyTrend } from '../utils/analytics'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Flame, CheckCircle, GraduationCap } from 'lucide-react'

function DashboardHome() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchLeads() }, [])

  const fetchLeads = async () => {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (!error) setLeads(data)
    setLoading(false)
  }

  const kpis = computeKPIs(leads)
  const trend = monthlyTrend(leads)
  const recent = leads.slice(0, 5)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) return <p className="text-gray-400 text-center mt-10">Loading dashboard...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{greeting()}, Admin 👋</h1>
        <p className="text-sm text-gray-500">Here's what's happening with your leads today</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Leads" value={kpis.total} icon={Users} color="from-indigo-500 to-indigo-600" />
        <StatCard label="Hot Leads" value={kpis.hot} icon={Flame} color="from-red-500 to-orange-500" />
        <StatCard label="Qualified" value={kpis.qualified} icon={CheckCircle} color="from-purple-500 to-purple-600" />
        <StatCard label="Enrolled" value={kpis.enrolled} icon={GraduationCap} color="from-green-500 to-emerald-600" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Lead Volume Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recent.length === 0 && <p className="text-gray-400 text-sm">No leads yet.</p>}
            {recent.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-semibold">
                  {lead.name?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 font-medium">{lead.name}</p>
                  <p className="text-xs text-gray-400">{lead.status || 'New'} · {lead.course_interest || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

export default DashboardHome