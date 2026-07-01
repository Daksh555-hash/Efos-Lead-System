import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { computeKPIs, sourceBreakdown, monthlyTrend, funnelBreakdown } from '../utils/analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Users, Flame, CheckCircle, TrendingUp, GraduationCap } from 'lucide-react'

function AnalyticsDashboard() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchLeads() }, [])

  const fetchLeads = async () => {
    const { data, error } = await supabase.from('leads').select('*')
    if (!error) setLeads(data)
    setLoading(false)
  }

  const kpis = computeKPIs(leads)
  const sources = sourceBreakdown(leads)
  const trend = monthlyTrend(leads)
  const funnel = funnelBreakdown(leads)

  const kpiCards = [
    { label: 'Total Leads', value: kpis.total, icon: Users, color: 'from-indigo-500 to-indigo-600' },
    { label: 'Hot Leads', value: kpis.hot, icon: Flame, color: 'from-red-500 to-orange-500' },
    { label: 'Qualified Leads', value: kpis.qualified, icon: CheckCircle, color: 'from-purple-500 to-purple-600' },
    { label: 'Enrollments', value: kpis.enrolled, icon: GraduationCap, color: 'from-green-500 to-emerald-600' },
    { label: 'Conversion Rate', value: `${kpis.conversionRate}%`, icon: TrendingUp, color: 'from-cyan-500 to-blue-600' },
  ]

  if (loading) return <p className="text-gray-400 text-center mt-10">Loading analytics...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Performance Analytics</h1>
        <p className="text-sm text-gray-500">Track conversion, enrollment, and lead source performance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Lead Source Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sources}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis dataKey="source" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#4F46E5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Monthly Lead Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#06B6D4" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">Enrollment Funnel</h3>
        <div className="space-y-2">
          {funnel.map((stage) => {
            const max = funnel[0].value || 1
            const pct = Math.max((stage.value / max) * 100, 4)
            return (
              <div key={stage.name} className="flex items-center gap-3">
                <span className="w-20 sm:w-24 text-xs text-gray-500 shrink-0">{stage.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-end px-3 text-white text-xs font-semibold transition-all"
                    style={{ width: `${pct}%` }}
                    title={`${stage.name}: ${stage.value} lead${stage.value === 1 ? '' : 's'}`}
                  >
                    {stage.value}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard