import { supabase } from '../supabaseClient'

// Uploads a file to Supabase Storage and returns a public, force-download URL
export async function uploadAttachment(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${Date.now()}_${safeName}`

  const { error } = await supabase.storage
    .from('lead-attachments')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw new Error('File upload failed: ' + error.message)

  const { data } = supabase.storage.from('lead-attachments').getPublicUrl(path)

  // The `download` query param is what forces an actual download instead of opening a preview tab
  return `${data.publicUrl}?download=${encodeURIComponent(file.name)}`
}