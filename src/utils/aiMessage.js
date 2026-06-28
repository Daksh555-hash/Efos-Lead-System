const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export async function generateMessage(lead, channel) {
  const prompts = {
    WhatsApp: `Generate a short, friendly WhatsApp message (under 80 words) for a student named ${lead.name} from ${lead.city || 'their city'} who is interested in ${lead.course_interest || 'our programs'} and has completed ${lead.qualification || 'their studies'}. Mention EFOS offers industry-oriented programs with placement assistance, practical projects, and mentorship. End with a soft call to action. Plain text only, no markdown.`,
    Email: `Write a warm, professional admissions email (under 150 words) for a student named ${lead.name} interested in ${lead.course_interest || 'our programs'}, who has completed ${lead.qualification || 'their studies'}. Mention EFOS's industry-oriented curriculum, placement support, and mentorship. Start with a line beginning "Subject:" followed by a short subject line, then the email body. Plain text only, no markdown.`,
    SMS: `Write a very short SMS (under 30 words) reminding ${lead.name} about their interest in ${lead.course_interest || 'our course'} at EFOS, with a soft call to action. Plain text only.`
  }

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompts[channel] }] }]
    })
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No message generated.'
}
const followUpThemes = {
  1: 'a warm Welcome message introducing the program',
  3: 'Program Details & Benefits, mentioning curriculum highlights and placement support',
  5: 'a short Success Story about a past student who achieved great results',
  7: 'a gentle Reminder nudging them to take the next step',
  10: 'a Final Follow-Up message, creating soft urgency before the offer window closes'
}

export async function generateFollowUpMessage(lead, day) {
  const theme = followUpThemes[day] || 'a friendly follow-up'
  const prompt = `Write a short WhatsApp message (under 60 words) for ${lead.name}, who is interested in ${lead.course_interest || 'our programs'} at EFOS. This is a Day ${day} follow-up with the theme: ${theme}. Keep tone warm and non-pushy. Plain text only, no markdown.`

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
}