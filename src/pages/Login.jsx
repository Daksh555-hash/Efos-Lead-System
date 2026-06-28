import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-cyan-50 to-purple-50 p-4">
      <div className="w-full max-w-sm backdrop-blur-xl bg-white/60 border border-white/80 shadow-xl rounded-3xl p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent mb-3 text-white font-bold text-lg">E</div>
          <h1 className="text-2xl font-bold text-gray-800">Counselor Login</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to access the admin dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full px-4 py-3 rounded-xl bg-white/70 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none text-gray-700"
            type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="w-full px-4 py-3 rounded-xl bg-white/70 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none text-gray-700"
            type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:shadow-xl transition-all disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        {error && <p className="text-center mt-4 text-sm font-medium text-red-500">{error}</p>}
        <p className="text-center text-xs text-gray-400 mt-6"><Link to="/" className="text-primary font-medium"> Back to application form</Link></p>
      </div>
    </div>
  )
}

export default Login