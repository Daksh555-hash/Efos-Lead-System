const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendTelegramMessage(chatId, text) {
  if (!chatId) throw new Error('No Telegram Chat ID saved for this lead.')
  const res = await fetch(`${BASE_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.description || 'Telegram send failed.')
  return data
}

export async function sendTelegramPhoto(chatId, caption, file) {
  if (!chatId) throw new Error('No Telegram Chat ID saved for this lead.')
  const formData = new FormData()
  formData.append('chat_id', chatId)
  formData.append('caption', caption)
  formData.append('photo', file)
  const res = await fetch(`${BASE_URL}/sendPhoto`, { method: 'POST', body: formData })
  const data = await res.json()
  if (!data.ok) throw new Error(data.description || 'Telegram photo send failed.')
  return data
}

export async function sendTelegramDocument(chatId, caption, file) {
  if (!chatId) throw new Error('No Telegram Chat ID saved for this lead.')
  const formData = new FormData()
  formData.append('chat_id', chatId)
  formData.append('caption', caption)
  formData.append('document', file)
  const res = await fetch(`${BASE_URL}/sendDocument`, { method: 'POST', body: formData })
  const data = await res.json()
  if (!data.ok) throw new Error(data.description || 'Telegram document send failed.')
  return data
}

// Picks the right endpoint automatically based on whether a file is attached, and its type
export async function sendTelegramWithOptionalFile(chatId, text, file) {
  if (!file) return sendTelegramMessage(chatId, text)
  if (file.type.startsWith('image/')) return sendTelegramPhoto(chatId, text, file)
  return sendTelegramDocument(chatId, text, file)
}