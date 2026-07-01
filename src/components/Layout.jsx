import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, UserPlus, BrainCircuit, MessageSquare, Workflow, BarChart3, UserCheck, LogOut, Menu, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/leads', label: 'Lead Management', icon: Users },
  { to: '/admin/register', label: 'Add Lead', icon: UserPlus },
  { to: '/admin/scoring', label: 'AI Scoring', icon: BrainCircuit },
  { to: '/admin/messaging', label: 'AI Messaging', icon: MessageSquare },
  { to: '/admin/automation', label: 'Automation', icon: Workflow },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/counselors', label: 'Counselors', icon: UserCheck },
]

function Layout() {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const closeMobile = () => setMobileOpen(false)

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-cyan-50 to-purple-50">

      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#1e1b4b] text-white flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center font-bold text-sm">E</div>
          <span className="font-semibold">EFOS AI</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-1.5">
          <Menu size={22} />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={closeMobile} />
      )}

      <aside
        className={`fixed md:static top-0 left-0 h-full w-64 bg-gradient-to-b from-[#1e1b4b] to-[#312e81] text-white flex flex-col py-6 px-4 z-50 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between px-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center font-bold">E</div>
            <span className="font-semibold text-lg">EFOS AI</span>
          </div>
          <button onClick={closeMobile} className="md:hidden text-indigo-200">
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              onClick={closeMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive ? 'bg-white/15 text-white font-medium' : 'text-indigo-200 hover:bg-white/10'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-indigo-200 hover:bg-white/10 transition-all">
          <LogOut size={18} />
          Sign Out
        </button>
      </aside>

      <main className="flex-1 min-w-0 w-full p-4 pt-20 md:p-8 md:pt-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout