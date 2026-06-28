// Tracks how many times this specific browser has visited the application page.
// No input field needed — this runs silently in the background.
export function trackAndGetVisits() {
  const key = 'efos_website_visits'
  const current = parseInt(localStorage.getItem(key) || '0', 10)
  const updated = current + 1
  localStorage.setItem(key, String(updated))
  return updated
}