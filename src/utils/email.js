import emailjs from '@emailjs/browser'
import { uploadAttachment } from './fileUpload'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

export async function sendEmail({ toEmail, toName, subject, message, file }) {
  if (!toEmail) throw new Error('This lead has no email address on file.')

  let finalMessage = message

  if (file) {
    const downloadUrl = await uploadAttachment(file)
    finalMessage += `\n\n📎 Download attachment: ${downloadUrl}`
  }

  const params = {
    to_email: toEmail,
    to_name: toName || 'Student',
    subject: subject || 'A message from EFOS',
    message: finalMessage,
  }

  return emailjs.send(SERVICE_ID, TEMPLATE_ID, params, PUBLIC_KEY)
}