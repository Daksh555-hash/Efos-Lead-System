import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { UserPlus, Briefcase, UploadCloud } from 'lucide-react'
import ImportLeads from '../components/ImportLeads'

const DEPARTMENTS = ['BTech Admissions', 'Diploma Programs', 'BCA Admissions', 'MBA Admissions', 'Data Science Programs', 'General Counseling']
const STATUSES = ['Active', 'On Leave', 'Inactive']

function RegisterLead() {
  const [tab, setTab] = useState('lead')

  const [form, setForm] = useState({
    name: '', email: '', phone: '', city: '',
    qualification: '', course_interest: '',
    age: '', downloaded_brochure: false, website_visits: 0
  })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    const { error } = await supabase.from('leads').insert([{
      ...form,
      age: form.age ? parseInt(form.age) : null,
      website_visits: parseInt(form.website_visits) || 0,
      source: 'Website'
    }])
    setLoading(false)
    if (error) {
      setMsg('❌ Error: ' + error.message)
    } else {
      setMsg('✅ Lead submitted successfully!')
      setForm({ name: '', email: '', phone: '', city: '', qualification: '', course_interest: '', age: '', downloaded_brochure: false, website_visits: 0 })
    }
  }

  const [counselorForm, setCounselorForm] = useState({
    name: '', email: '', phone: '', specialization: '', status: 'Active'
  })
  const [counselorMsg, setCounselorMsg] = useState('')
  const [counselorLoading, setCounselorLoading] = useState(false)

  const handleCounselorChange = (e) => {
    setCounselorForm({ ...counselorForm, [e.target.name]: e.target.value })
  }

  const handleCounselorSubmit = async (e) => {
    e.preventDefault()
    setCounselorLoading(true)
    setCounselorMsg('')
    const { error } = await supabase.from('counselors').insert([counselorForm])
    setCounselorLoading(false)
    if (error) {
      setCounselorMsg('❌ Error: ' + error.message)
    } else {
      setCounselorMsg('✅ Counselor added successfully!')
      setCounselorForm({ name: '', email: '', phone: '', specialization: '', status: 'Active' })
    }
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white/70 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all placeholder-gray-400 text-gray-700"

  return (
    <div className="flex justify-center items-start pt-6 px-2">
      <div className={`w-full transition-all ${tab === 'import' ? 'max-w-3xl' : 'max-w-md'}`}>

        <div className="flex gap-2 mb-4 bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-1.5">
          <button
            onClick={() => setTab('lead')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              tab === 'lead' ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md' : 'text-gray-500 hover:bg-white/50'
            }`}
          >
            <UserPlus size={16} /> <span className="hidden sm:inline">Add</span> Lead
          </button>
          <button
            onClick={() => setTab('counselor')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              tab === 'counselor' ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md' : 'text-gray-500 hover:bg-white/50'
            }`}
          >
            <Briefcase size={16} /> <span className="hidden sm:inline">Add</span> Counselor
          </button>
          <button
            onClick={() => setTab('import')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              tab === 'import' ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md' : 'text-gray-500 hover:bg-white/50'
            }`}
          >
            <UploadCloud size={16} /> Import
          </button>
        </div>

        {tab === 'lead' && (
          <div className="backdrop-blur-xl bg-white/70 border border-white/80 shadow-xl rounded-3xl p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Register New Lead</h1>
              <p className="text-sm text-gray-500 mt-1">Add a new student to the pipeline</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input className={inputClass} name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
              <input className={inputClass} name="email" type="email" placeholder="Email Address" value={form.email} onChange={handleChange} required />
              <input className={inputClass} name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} required />
              <input className={inputClass} name="city" placeholder="City" value={form.city} onChange={handleChange} />
              <input className={inputClass} name="qualification" placeholder="Qualification" value={form.qualification} onChange={handleChange} />
              <input className={inputClass} name="course_interest" placeholder="Course Interested" value={form.course_interest} onChange={handleChange} />
              <input className={inputClass} name="age" type="number" placeholder="Age" value={form.age} onChange={handleChange} />
              <input className={inputClass} name="website_visits" type="number" placeholder="Website Visits" value={form.website_visits} onChange={handleChange} />

              <label className="flex items-center gap-2 text-sm text-gray-600 px-1">
                <input type="checkbox" name="downloaded_brochure" checked={form.downloaded_brochure} onChange={handleChange} className="w-4 h-4 accent-primary" />
                Downloaded Brochure
              </label>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
            {msg && <p className={`text-center mt-4 text-sm font-medium ${msg.includes('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
          </div>
        )}

        {tab === 'counselor' && (
          <div className="backdrop-blur-xl bg-white/70 border border-white/80 shadow-xl rounded-3xl p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Add New Counselor</h1>
              <p className="text-sm text-gray-500 mt-1">Onboard a counselor to your team</p>
            </div>
            <form onSubmit={handleCounselorSubmit} className="space-y-4">
              <input className={inputClass} name="name" placeholder="Full Name" value={counselorForm.name} onChange={handleCounselorChange} required />
              <input className={inputClass} name="email" type="email" placeholder="Work Email" value={counselorForm.email} onChange={handleCounselorChange} required />
              <input className={inputClass} name="phone" placeholder="Phone Number" value={counselorForm.phone} onChange={handleCounselorChange} required />

              <select className={inputClass} name="specialization" value={counselorForm.specialization} onChange={handleCounselorChange} required>
                <option value="" disabled>Select Department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>

              <select className={inputClass} name="status" value={counselorForm.status} onChange={handleCounselorChange}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <button type="submit" disabled={counselorLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60">
                {counselorLoading ? 'Adding...' : 'Add Counselor'}
              </button>
            </form>
            {counselorMsg && <p className={`text-center mt-4 text-sm font-medium ${counselorMsg.includes('✅') ? 'text-green-600' : 'text-red-500'}`}>{counselorMsg}</p>}
          </div>
        )}

        {tab === 'import' && <ImportLeads />}

      </div>
    </div>
  )
}

export default RegisterLead