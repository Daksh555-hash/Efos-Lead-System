import { useEffect, useState, createContext, useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export const CounselorContext = createContext(null)
export const useCounselor = () => useContext(CounselorContext)

function CounselorProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading')
  const [counselor, setCounselor] = useState(null)

    useEffect(() => {
    // If user didn't check "Remember me", clear session on new browser open
    const isTemp = sessionStorage.getItem('efos_temp_session')
    if (!isTemp && localStorage.getItem('efos_temp_flag')) {
      supabase.auth.signOut()
      localStorage.removeItem('efos_temp_flag')
      setStatus('unauthorized')
      return
    }
    checkAccess()
  }, [])

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setStatus('unauthorized')
      return
    }

    const { data, error } = await supabase
      .from('counselors')
      .select('*')
      .eq('email', session.user.email)
      .single()

    if (error || !data) {
      setStatus('unauthorized')
      return
    }

    setCounselor(data)
    setStatus('authorized')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-cyan-50 to-purple-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Verifying counselor access...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthorized') {
    return <Navigate to="/counselor-login" replace />
  }

  return (
    <CounselorContext.Provider value={counselor}>
      {children}
    </CounselorContext.Provider>
  )
}

export default CounselorProtectedRoute