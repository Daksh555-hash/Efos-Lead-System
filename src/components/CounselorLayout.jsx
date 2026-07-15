import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCounselor } from './CounselorProtectedRoute'
import { Bell, LogOut, ChevronDown } from 'lucide-react'
import logo from '../assets/logo.jpg'

const STATUS_OPTIONS = [
  { value: 'Active', label: '🟢 Active', color: 'bg-green-500' },
  { value: 'On Leave', label: '🟡 On Leave', color: 'bg-amber-500' },
  { value: 'Inactive', label: '🔴 Inactive', color: 'bg-red-500' },
]

function CounselorLayout() {
  const counselor = useCounselor()
  const navigate = useNavigate()
  const [currentStatus, setCurrentStatus] = useState(counselor?.status || 'Active')
  const [statusOpen, setStatusOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [hotLeadCount, setHotLeadCount] = useState(0)
  const statusRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    if (!counselor) return
    const fetchHotLeads = async () => {
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('counselor_id', counselor.id)
        .gte('score', 80)
        .not('status', 'in', '("Enrolled","Rejected","Contacted")')
      setHotLeadCount(count || 0)
    }
    fetchHotLeads()

    const channel = supabase
      .channel('counselor-leads')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads',
        filter: `counselor_id=eq.${counselor.id}`
      }, () => {
        fetchHotLeads()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [counselor])

  useEffect(() => {
    const handleClick = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleStatusChange = async (newStatus) => {
    setCurrentStatus(newStatus)
    setStatusOpen(false)
    await supabase
      .from('counselors')
      .update({ status: newStatus })
      .eq('id', counselor.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/counselor-login')
  }

  const initials = counselor?.name
    ? counselor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const currentStatusObj = STATUS_OPTIONS.find(s => s.value === currentStatus) || STATUS_OPTIONS[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-cyan-50 to-purple-50">

      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md">
              <img src={logo} alt="EFOS" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-bold text-gray-800 text-sm">EFOS AI</span>
              <span className="text-xs text-gray-400 ml-2 hidden sm:inline">Counselor Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">

            <div className="relative" ref={statusRef}>
              <button
                onClick={() => setStatusOpen(!statusOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-sm transition-all"
              >
                <span className={`w-2 h-2 rounded-full ${currentStatusObj.color}`} />
                <span className="text-gray-700 font-medium hidden sm:inline">{currentStatus}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {statusOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusChange(opt.value)}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2.5 transition-colors ${
                        currentStatus === opt.value ? 'bg-primary/5 text-primary font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="relative p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all">
              <Bell size={18} className="text-gray-600" />
              {hotLeadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {hotLeadCount > 9 ? '9+' : hotLeadCount}
                </span>
              )}
            </button>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-primary/20 hover:scale-105 transition-transform"
              >
                {initials}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">{counselor?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{counselor?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors mt-1"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default CounselorLayout