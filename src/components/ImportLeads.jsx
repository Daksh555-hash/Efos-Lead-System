import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { LEAD_FIELDS, parseSheetFile, autoMatchColumns, rowToLead, downloadSampleTemplate } from '../utils/importParser'
import { UploadCloud, FileSpreadsheet, ArrowLeft, CheckCircle2, Download } from 'lucide-react'

function ImportLeads() {
  const [step, setStep] = useState('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState([])
  const [dataRows, setDataRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    setParsing(true)
    try {
      const { headers, dataRows } = await parseSheetFile(file)
      if (dataRows.length === 0) throw new Error('No data rows found in this file.')
      setFileName(file.name)
      setHeaders(headers)
      setDataRows(dataRows)
      setMapping(autoMatchColumns(headers))
      setStep('map')
    } catch (err) {
      setError(err.message)
    }
    setParsing(false)
    e.target.value = ''
  }

  const updateMapping = (fieldKey, headerIndex) => {
    setMapping({ ...mapping, [fieldKey]: headerIndex })
  }

  const missingRequired = LEAD_FIELDS.filter((f) => f.required && (mapping[f.key] === -1 || mapping[f.key] === undefined))

  const handleImport = async () => {
    setImporting(true)
    setError('')
    try {
      const { data: existing } = await supabase.from('leads').select('email')
      const existingEmails = new Set((existing || []).map((l) => (l.email || '').toLowerCase()).filter(Boolean))

      const seenInBatch = new Set()
      const toInsert = []
      let skippedMissing = 0
      let skippedDuplicate = 0

      for (const row of dataRows) {
        const lead = rowToLead(row, mapping)
        if (!lead.name && !lead.email) {
          skippedMissing++
          continue
        }
        const emailKey = lead.email.toLowerCase()
        if (emailKey && (existingEmails.has(emailKey) || seenInBatch.has(emailKey))) {
          skippedDuplicate++
          continue
        }
        if (emailKey) seenInBatch.add(emailKey)
        toInsert.push(lead)
      }

      let insertedCount = 0
      const CHUNK = 200
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const chunk = toInsert.slice(i, i + CHUNK)
        const { error } = await supabase.from('leads').insert(chunk)
        if (error) throw error
        insertedCount += chunk.length
      }

      setSummary({ imported: insertedCount, skippedDuplicate, skippedMissing })
      setStep('done')
    } catch (err) {
      setError(err.message)
    }
    setImporting(false)
  }

  const resetImport = () => {
    setStep('upload')
    setFileName('')
    setHeaders([])
    setDataRows([])
    setMapping({})
    setSummary(null)
    setError('')
  }

  const previewRows = dataRows.slice(0, 5)

  return (
    <div className="backdrop-blur-xl bg-white/70 border border-white/80 shadow-xl rounded-3xl p-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Import Leads</h1>
        <p className="text-sm text-gray-500 mt-1">Bulk-add students from an Excel or CSV file</p>
      </div>

      {error && <p className="text-center mb-4 text-sm font-medium text-red-500">❌ {error}</p>}

      {step === 'upload' && (
        <div className="text-center">
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-2xl py-10 px-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
            <UploadCloud size={32} className="text-primary" />
            <span className="text-sm font-medium text-gray-600">
              {parsing ? 'Reading file...' : 'Click to choose a .xlsx or .csv file'}
            </span>
            <span className="text-xs text-gray-400">Exported from Excel or Google Sheets</span>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} disabled={parsing} />
          </label>

          <button onClick={downloadSampleTemplate}
            className="flex items-center gap-2 mx-auto mt-5 text-xs font-medium text-primary hover:text-accent transition-colors">
            <Download size={14} /> Download a sample template
          </button>

          <p className="text-xs text-gray-400 mt-4 leading-relaxed">
            From Google Sheets: File → Download → Microsoft Excel (.xlsx) or CSV, then upload that file here.
          </p>
        </div>
      )}

      {step === 'map' && (
        <div>
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
            <FileSpreadsheet size={16} className="text-primary" />
            <span className="font-medium truncate">{fileName}</span>
            <span className="text-gray-400">· {dataRows.length} row(s) found</span>
          </div>

          <h3 className="text-sm font-semibold text-gray-600 mb-2">Match your columns</h3>
          <p className="text-xs text-gray-400 mb-4">We've auto-matched what we could. Review and correct anything before importing.</p>

          <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
            {LEAD_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <span className="w-40 text-sm text-gray-700 shrink-0">
                  {field.label}{field.required && <span className="text-red-500"> *</span>}
                </span>
                <select
                  value={mapping[field.key] ?? -1}
                  onChange={(e) => updateMapping(field.key, Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm outline-none"
                >
                  <option value={-1}>-- Not in sheet --</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {missingRequired.length > 0 && (
            <p className="text-xs text-red-500 mb-4">
              ⚠️ Please map: {missingRequired.map((f) => f.label).join(', ')} before importing.
            </p>
          )}

          <h3 className="text-sm font-semibold text-gray-600 mb-2">Preview (first 5 rows)</h3>
          <div className="overflow-x-auto mb-6 rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left">
                  {LEAD_FIELDS.map((f) => <th key={f.key} className="px-3 py-2 font-medium whitespace-nowrap">{f.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => {
                  const lead = rowToLead(row, mapping)
                  return (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 whitespace-nowrap">{lead.name || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{lead.email || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{lead.phone || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{lead.city || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{lead.age ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{lead.qualification || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{lead.course_interest || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{lead.downloaded_brochure ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{lead.website_visits}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{lead.source}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={resetImport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-all">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={handleImport} disabled={importing || missingRequired.length > 0}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all disabled:opacity-60">
              {importing ? 'Importing...' : `Import ${dataRows.length} Lead(s)`}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && summary && (
        <div className="text-center py-6">
          <CheckCircle2 size={40} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Import Complete</h2>
          <p className="text-sm text-gray-600 mb-1">✅ {summary.imported} lead(s) imported successfully</p>
          {summary.skippedDuplicate > 0 && <p className="text-sm text-gray-500">⏭ {summary.skippedDuplicate} skipped (already existed)</p>}
          {summary.skippedMissing > 0 && <p className="text-sm text-gray-500">⏭ {summary.skippedMissing} skipped (missing name & email)</p>}
          <button onClick={resetImport}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all">
            Import Another File
          </button>
        </div>
      )}
    </div>
  )
}

export default ImportLeads