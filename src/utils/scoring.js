export function calculateScore(lead) {
  let interestScore = 0
  let educationScore = 0
  let engagementScore = 0
  const breakdown = []

  if (lead.course_interest?.toLowerCase().includes('btech')) {
    interestScore += 20
    breakdown.push({ label: 'Interested in BTech', points: 20 })
  }

  if (lead.age >= 16 && lead.age <= 18) {
    educationScore += 25
    breakdown.push({ label: 'Age between 16–18', points: 25 })
  }

  if (lead.qualification?.toLowerCase().includes('12th')) {
    educationScore += 20
    breakdown.push({ label: '12th Completed Student', points: 20 })
  }

  if (lead.downloaded_brochure) {
    engagementScore += 15
    breakdown.push({ label: 'Downloaded Brochure', points: 15 })
  }

  if (lead.website_visits > 3) {
    engagementScore += 20
    breakdown.push({ label: 'Visited Website > 3 times', points: 20 })
  }

  const total = interestScore + educationScore + engagementScore

  let category = 'Cold'
  if (total > 70) category = 'Hot'
  else if (total > 40) category = 'Warm'

  return { interestScore, educationScore, engagementScore, total, category, breakdown }
}

export function categoryColor(category) {
  if (category === 'Hot') return { text: 'text-red-500', bg: 'bg-red-100', ring: '#ef4444' }
  if (category === 'Warm') return { text: 'text-amber-500', bg: 'bg-amber-100', ring: '#f59e0b' }
  return { text: 'text-blue-500', bg: 'bg-blue-100', ring: '#3b82f6' }
}