import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { trackAndGetVisits } from '../utils/visitTracker'
import { Download } from 'lucide-react'
import logo from '../assets/logo.jpg'

const QUALIFICATIONS = ['10th Completed', '12th Completed', 'Diploma', 'Graduate', 'Post Graduate']
const COURSES = ['BTech', 'Diploma', 'BCA', 'MBA', 'Data Science', 'Other']

function PublicApply() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', city: '',
    qualification: '', course_interest: '', age: '', downloaded_brochure: false,
  })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [visits, setVisits] = useState(0)

  useEffect(() => {
    setVisits(trackAndGetVisits())
  }, [])

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleDownloadBrochure = () => {
    const tempLink = document.createElement('a')
    tempLink.href = '/brochure.pdf'
    tempLink.download = 'EFOS_Brochure.pdf'
    document.body.appendChild(tempLink)
    tempLink.click()
    document.body.removeChild(tempLink)
    setForm((f) => ({ ...f, downloaded_brochure: true }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    const { error } = await supabase.from('leads').insert([{
      ...form,
      age: form.age ? parseInt(form.age) : null,
      website_visits: visits,
      source: 'Website',
    }])
    setLoading(false)
    if (error) {
      setMsg('❌ Something went wrong. Please try again.')
    } else {
      setMsg('✅ Thank you! Our team will reach out to you shortly.')
      setForm({ name: '', email: '', phone: '', city: '', qualification: '', course_interest: '', age: '', downloaded_brochure: false })
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl bg-white/70 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all placeholder-gray-400 text-gray-700"

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-cyan-50 to-purple-50 p-4">

      <div className="absolute inset-0 overflow-hidden">
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 w-[180vmax] h-[180vmax] object-contain opacity-[0.06] pointer-events-none select-none"
          style={{ transform: 'translate(-50%, -50%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md backdrop-blur-xl bg-white/70 border border-white/80 shadow-xl rounded-3xl p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent mb-3 text-white font-bold text-lg">E</div>
          <h1 className="text-2xl font-bold text-gray-800">Apply to EFOS</h1>
          <p className="text-sm text-gray-500 mt-1">Start your enrollment journey with us today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input className={inputClass} name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
          <input className={inputClass} name="email" type="email" placeholder="Email Address" value={form.email} onChange={handleChange} required />
          <input className={inputClass} name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} required />
          <input className={inputClass} name="city" placeholder="City" value={form.city} onChange={handleChange} />
          <input className={inputClass} name="age" type="number" placeholder="Age" value={form.age} onChange={handleChange} />

          <select className={inputClass} name="qualification" value={form.qualification} onChange={handleChange} required>
            <option value="" disabled>Select your highest qualification</option>
            {QUALIFICATIONS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>

          <select className={inputClass} name="course_interest" value={form.course_interest} onChange={handleChange} required>
            <option value="" disabled>Select course you're interested in</option>
            {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            type="button"
            onClick={handleDownloadBrochure}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-all"
          >
            <Download size={16} />
            Download Brochure
          </button>

          <label className="flex items-center gap-2 text-sm text-gray-600 px-1">
            <input type="checkbox" name="downloaded_brochure" checked={form.downloaded_brochure} onChange={handleChange} className="w-4 h-4 accent-primary" />
            I have downloaded the brochure
          </label>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>

        {msg && <p className={`text-center mt-4 text-sm font-medium ${msg.includes('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}

        <p className="text-center text-xs text-gray-400 mt-6">
          <Link to="/login" className="text-primary font-medium">Staff Login</Link>
        </p>
      </div>
    </div>
  )
}

export default PublicApply