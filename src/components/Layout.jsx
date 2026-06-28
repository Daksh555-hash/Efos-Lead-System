import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, UserPlus, BrainCircuit, MessageSquare, Workflow, BarChart3, UserCheck, LogOut } from 'lucide-react'
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
  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-cyan-50 to-purple-50">
      <aside className="w-64 bg-gradient-to-b from-[#1e1b4b] to-[#312e81] text-white flex flex-col py-6 px-4">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center font-bold">E</div>
          <span className="font-semibold text-lg">EFOS AI</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/admin'}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive ? 'bg-white/15 text-white font-medium' : 'text-indigo-200 hover:bg-white/10'}`}>
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
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout