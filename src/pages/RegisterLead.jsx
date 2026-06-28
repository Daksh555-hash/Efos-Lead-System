import { useState } from 'react'
import { supabase } from '../supabaseClient'

function RegisterLead() {
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

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white/70 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all placeholder-gray-400 text-gray-700"

  return (
    <div className="flex justify-center items-start pt-6">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/70 border border-white/80 shadow-xl rounded-3xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Register New Lead</h1>
          <p className="text-sm text-gray-500 mt-1">Add a new student to the pipeline</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className={inputClass} name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
          <input className={inputClass} name="email" type="email" placeholder="Email Address" value={form.email} onChange={handleChange} required />
          <input className={inputClass} name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} required />
          <input className={inputClass} name="city" placeholder="City" value={form.city} onChange={handleChange} />
          <input className={inputClass} name="qualification" placeholder="Qualification (e.g. 12th Completed)" value={form.qualification} onChange={handleChange} />
          <input className={inputClass} name="course_interest" placeholder="Course Interested (e.g. BTech)" value={form.course_interest} onChange={handleChange} />
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
    </div>
  )
}

export default RegisterLead