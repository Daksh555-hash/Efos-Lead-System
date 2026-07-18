import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCounselor } from './CounselorProtectedRoute'
import { Bell, LogOut, ChevronDown, Menu, X, LayoutDashboard } from 'lucide-react'
import logo from '../assets/logo.jpg'

const STATUS_OPTIONS = [
  { value: 'Active', label: '🟢 Active', color: 'bg-green-500' },
  { value: 'On Leave', label: '🟡 On Leave', color: 'bg-amber-500' },
  { value: 'Inactive', label: '🔴 Inactive', color: 'bg-red-500' },
]

function CounselorLayout() {
  const counselor = useCounselor()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  
  const [currentStatus, setCurrentStatus] = useState(counselor?.status || 'Active')
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef(null)

  // Messages & Notifications
  const [messages, setMessages] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    if (!counselor) return

    // Fetch initial messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`counselor_id.eq.${counselor.id},counselor_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(20)
      setMessages(data || [])
    }
    fetchMessages()

    // Listen for new real-time messages
    const channel = supabase
      .channel('counselor-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        if (!msg.counselor_id || msg.counselor_id === counselor.id) {
          setMessages(prev => [msg, ...prev])
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [counselor])

  useEffect(() => {
    const handleClick = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleStatusChange = async (newStatus) => {
    setCurrentStatus(newStatus)
    setStatusOpen(false)
    await supabase.from('counselors').update({ status: newStatus }).eq('id', counselor.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/counselor-login')
  }

  const markAsRead = async (msgId) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_read: true } : m))
  }

  const closeMobile = () => setMobileOpen(false)
  const currentStatusObj = STATUS_OPTIONS.find(s => s.value === currentStatus) || STATUS_OPTIONS[0]
  const unreadCount = messages.filter(m => !m.is_read).length

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-cyan-50 to-purple-50">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#1e1b4b] text-white flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0"><img src={logo} alt="EFOS" className="w-full h-full object-cover"/></div>
          <span className="font-semibold text-sm">Counselor Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="relative p-1.5" ref={notifRef}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">{unreadCount}</span>}
          </button>
          <button onClick={() => setMobileOpen(true)} className="p-1.5"><Menu size={22} /></button>
        </div>
      </div>

      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={closeMobile} />}

      {/* Sidebar */}
      <aside className={`fixed md:static top-0 left-0 h-full w-64 bg-gradient-to-b from-[#1e1b4b] to-[#312e81] text-white flex flex-col py-6 px-4 z-50 transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between px-2 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shrink-0"><img src={logo} alt="EFOS" className="w-full h-full object-cover"/></div>
            <span className="font-semibold text-lg">Counselor Portal</span>
          </div>
          <button onClick={closeMobile} className="md:hidden text-indigo-200"><X size={20} /></button>
        </div>

        {/* User Info & Status */}
        <div className="px-3 mb-8 pb-6 border-b border-white/10">
          <p className="text-sm font-semibold truncate text-white mb-1">{counselor?.name}</p>
          <p className="text-xs text-indigo-300 truncate mb-4">{counselor?.email}</p>
          
          <div className="relative" ref={statusRef}>
            <button onClick={() => setStatusOpen(!statusOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 text-sm transition-all shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentStatusObj.color}`} />
                <span className="font-medium">{currentStatus}</span>
              </div>
              <ChevronDown size={14} className="text-indigo-200" />
            </button>
            {statusOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl py-1.5 z-50 overflow-hidden border border-gray-100">
                {STATUS_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => handleStatusChange(opt.value)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors">
                    <span className={`w-2 h-2 rounded-full ${opt.color}`} /> {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          <NavLink to="/counselor" end onClick={closeMobile} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive ? 'bg-white/15 text-white font-medium' : 'text-indigo-200 hover:bg-white/10'}`}>
            <LayoutDashboard size={18} /> My Dashboard
          </NavLink>
        </nav>

        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all mt-auto border border-transparent hover:border-red-500/20">
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        
        {/* Desktop Notification Header */}
        <header className="hidden md:flex h-16 bg-white/60 backdrop-blur-xl border-b border-gray-200/50 items-center justify-end px-8 shrink-0 z-20">
          <div className="relative" ref={notifRef}>
            <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="relative p-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 transition-all shadow-sm">
              <Bell size={18} className="text-gray-600" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">{unreadCount}</span>}
            </button>

            {/* Notification Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-[320px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
                <div className="px-5 py-3 border-b border-gray-50 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800 text-sm">Updates & Messages</h3>
                  {unreadCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{unreadCount} New</span>}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3"><Bell className="text-gray-300" size={20}/></div>
                      <p className="text-sm text-gray-500 font-medium">You're all caught up!</p>
                      <p className="text-xs text-gray-400 mt-1">No new messages from admins.</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} onClick={() => markAsRead(msg.id)} className={`px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${!msg.is_read ? 'bg-indigo-50/20' : ''}`}>
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                            {!msg.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"/>}
                            {msg.sender_name}
                          </span>
                          <span className="text-[10px] font-medium text-gray-400">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className={`text-sm leading-relaxed ${!msg.is_read ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 pt-20 md:pt-8 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default CounselorLayout