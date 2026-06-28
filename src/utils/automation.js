export const FOLLOWUP_DAYS = [1, 3, 5, 7, 10]

export function getDaysSince(dateStr) {
  const created = new Date(dateStr)
  const now = new Date()
  return Math.floor((now - created) / (1000 * 60 * 60 * 24))
}

// Finds the latest follow-up day a lead has become due for, but hasn't received yet
export function getDueDay(lead) {
  const daysSince = getDaysSince(lead.created_at)
  const last = lead.last_followup_day || 0
  const due = FOLLOWUP_DAYS.filter((d) => d <= daysSince && d > last)
  return due.length > 0 ? Math.max(...due) : null
}