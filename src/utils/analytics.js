export function computeKPIs(leads) {
  const total = leads.length
  const hot = leads.filter(l => l.score > 70).length
  const warm = leads.filter(l => l.score > 40 && l.score <= 70).length
  const cold = leads.filter(l => l.score <= 40).length
  const qualified = leads.filter(l => l.status === 'Qualified').length
  const enrolled = leads.filter(l => l.status === 'Enrolled').length
  const conversionRate = total > 0 ? ((enrolled / total) * 100).toFixed(1) : '0.0'
  return { total, hot, warm, cold, qualified, enrolled, conversionRate }
}

export function sourceBreakdown(leads) {
  const map = {}
  leads.forEach(l => {
    const src = l.source || 'Unknown'
    map[src] = (map[src] || 0) + 1
  })
  return Object.entries(map).map(([source, count]) => ({ source, count }))
}

export function monthlyTrend(leads) {
  const map = {}
  leads.forEach(l => {
    const date = new Date(l.created_at)
    const key = date.toLocaleString('default', { month: 'short', year: '2-digit' })
    map[key] = (map[key] || 0) + 1
  })
  return Object.entries(map).map(([month, count]) => ({ month, count }))
}

export function funnelBreakdown(leads) {
  const stages = ['New', 'Contacted', 'Interested', 'Follow-Up', 'Qualified', 'Enrolled']
  return stages.map(stage => ({
    name: stage,
    value: leads.filter(l => (l.status || 'New') === stage).length
  }))
}