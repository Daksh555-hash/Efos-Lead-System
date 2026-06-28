// Picks the counselor with the fewest currently assigned leads (load balancing)
export function pickCounselor(counselors, assignedLeads) {
  const counts = {}
  counselors.forEach((c) => { counts[c.id] = 0 })
  assignedLeads.forEach((l) => {
    if (l.counselor_id && counts[l.counselor_id] !== undefined) counts[l.counselor_id]++
  })

  let chosen = counselors[0]
  let min = Infinity
  counselors.forEach((c) => {
    if (counts[c.id] < min) {
      min = counts[c.id]
      chosen = c
    }
  })
  return chosen
}