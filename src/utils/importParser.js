import * as XLSX from 'xlsx'

export const LEAD_FIELDS = [
  { key: 'name', label: 'Full Name', required: true, aliases: ['name', 'fullname', 'studentname'] },
  { key: 'email', label: 'Email', required: true, aliases: ['email', 'emailaddress'] },
  { key: 'phone', label: 'Phone', required: false, aliases: ['phone', 'mobile', 'phonenumber', 'contact', 'contactnumber'] },
  { key: 'city', label: 'City', required: false, aliases: ['city', 'location'] },
  { key: 'age', label: 'Age', required: false, aliases: ['age'] },
  { key: 'qualification', label: 'Qualification', required: false, aliases: ['qualification', 'education', 'highestqualification'] },
  { key: 'course_interest', label: 'Course Interested', required: false, aliases: ['course', 'courseinterested', 'courseinterest', 'program'] },
  { key: 'downloaded_brochure', label: 'Downloaded Brochure', required: false, aliases: ['brochure', 'downloadedbrochure'] },
  { key: 'website_visits', label: 'Website Visits', required: false, aliases: ['visits', 'websitevisits'] },
  { key: 'source', label: 'Source', required: false, aliases: ['source'] },
]

function normalize(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function parseSheetFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
        const headers = (rows[0] || []).map((h) => String(h).trim())
        const dataRows = rows.slice(1).filter((r) => r.some((cell) => String(cell).trim() !== ''))
        resolve({ headers, dataRows })
      } catch (err) {
        reject(new Error("Could not read this file. Make sure it's a valid Excel or CSV file."))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read the file.'))
    reader.readAsArrayBuffer(file)
  })
}

export function autoMatchColumns(headers) {
  const mapping = {}
  LEAD_FIELDS.forEach((field) => {
    const idx = headers.findIndex((h) => field.aliases.includes(normalize(h)))
    mapping[field.key] = idx
  })
  return mapping
}

export function rowToLead(row, mapping) {
  const get = (key) => {
    const idx = mapping[key]
    if (idx === undefined || idx === -1 || idx === null) return ''
    return row[idx] !== undefined ? String(row[idx]).trim() : ''
  }

  const brochureRaw = get('downloaded_brochure').toLowerCase()

  return {
    name: get('name'),
    email: get('email'),
    phone: get('phone'),
    city: get('city'),
    age: get('age') ? parseInt(get('age')) || null : null,
    qualification: get('qualification'),
    course_interest: get('course_interest'),
    downloaded_brochure: ['yes', 'true', '1', 'y'].includes(brochureRaw),
    website_visits: get('website_visits') ? parseInt(get('website_visits')) || 0 : 0,
    source: get('source') || 'Bulk Import',
  }
}

export function downloadSampleTemplate() {
  const headerLine = 'Name,Email,Phone,City,Age,Qualification,Course Interested,Downloaded Brochure,Website Visits,Source'
  const sampleLine = 'Rahul Sharma,rahul@example.com,9876543210,Delhi,17,12th Completed,BTech,Yes,4,Google Forms'
  const csv = `${headerLine}\n${sampleLine}`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'EFOS_Lead_Import_Template.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}