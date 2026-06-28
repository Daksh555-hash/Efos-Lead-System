// Wraps any button action so loading state ALWAYS resets,
// even if something inside throws an error.
export async function safeRun({ setLoading, setStatusMsg, action }) {
  setLoading(true)
  setStatusMsg?.('')
  try {
    const result = await action()
    if (result) setStatusMsg?.(result)
  } catch (err) {
    console.error('Action failed:', err)
    setStatusMsg?.(`⚠️ Something went wrong: ${err.message}`)
  } finally {
    setLoading(false)
  }
}