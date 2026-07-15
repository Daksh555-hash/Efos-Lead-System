import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.jpg'
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react'

function CounselorLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // If "Remember me" is unchecked, clear session when browser closes
    if (!rememberMe && authData?.session) {
      sessionStorage.setItem('efos_temp_session', 'true')
    }

    if (authError) {
      setLoading(false)
      setError('Incorrect email or password.')
      return
    }

    const { data: counselor, error: counselorError } = await supabase
      .from('counselors')
      .select('*')
      .eq('email', email)
      .single()

    if (counselorError || !counselor) {
      setLoading(false)
      setError('This account is not registered as a counselor.')
      await supabase.auth.signOut()
      return
    }

    setLoading(false)
    navigate('/counselor')
  }

  const inputBaseClass = `w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm outline-none transition-all duration-200 placeholder-gray-400`
  const inputNormalClass = `${inputBaseClass} border-gray-200 bg-gray-50/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white text-gray-700`
  const inputErrorClass = `${inputBaseClass} border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-700`
  const currentInputClass = error ? inputErrorClass : inputNormalClass

  return (
    <div className="min-h-screen flex">

      {/* LEFT PANE — BRANDING */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f0d2e 0%, #1e1b4b 50%, #312e81 100%)' }}>

        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)' }} />

        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-center">
          <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20 mb-8 ring-2 ring-white/10">
            <img src={logo} alt="EFOS Logo" className="w-full h-full object-cover" />
          </div>

          <h1 className="text-white text-3xl font-bold mb-3 tracking-tight">
            EFOS AI
          </h1>
          <div className="w-12 h-1 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400 mb-6" />
          <p className="text-indigo-200 text-lg font-light leading-relaxed max-w-xs">
            Empowering Admissions.
            <br />
            Accelerating Enrollments.
          </p>

          <div className="mt-12 flex gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">98%</p>
              <p className="text-xs text-indigo-300 mt-1">Response Rate</p>
            </div>
            <div className="w-px bg-indigo-500/30" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">2.5x</p>
              <p className="text-xs text-indigo-300 mt-1">Faster Enrollment</p>
            </div>
            <div className="w-px bg-indigo-500/30" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">500+</p>
              <p className="text-xs text-indigo-300 mt-1">Leads Managed</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANE — LOGIN FORM */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white px-6 py-12">
        <div className="w-full max-w-md">

          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg">
              <img src={logo} alt="EFOS" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Welcome back, Counselor
            </h2>
            <p className="text-sm text-gray-500">
              Sign in to access your lead management workspace
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium animate-pulse">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="name@efos.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  required
                  className={currentInputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  required
                  className={`${currentInputClass} !pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-primary"
                />
                Remember me for 30 days
              </label>
              <button type="button" className="text-primary hover:text-accent font-medium transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-gray-400">
              <Link to="/" className="text-primary font-medium hover:text-accent transition-colors">
                ← Back to application form
              </Link>
            </p>
            <p className="text-xs text-gray-400">
              Admin?{' '}
              <Link to="/login" className="text-primary font-medium hover:text-accent transition-colors">
                Staff Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CounselorLogin