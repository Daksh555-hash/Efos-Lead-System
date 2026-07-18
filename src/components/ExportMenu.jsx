import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileSpreadsheet, FileType, ChevronDown } from 'lucide-react'

function ExportMenu({ onPDF, onCSV, onExcel, loading }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (fn) => {
    setOpen(false)
    fn?.()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 shadow-sm transition-all disabled:opacity-60"
      >
        <Download size={16} /> {loading ? 'Exporting...' : 'Export'} <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <button onClick={() => pick(onPDF)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 text-left">
            <FileText size={15} className="text-red-500" /> PDF Document
          </button>
          <button onClick={() => pick(onExcel)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 text-left">
            <FileSpreadsheet size={15} className="text-green-600" /> Excel (.xlsx)
          </button>
          <button onClick={() => pick(onCSV)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 text-left">
            <FileType size={15} className="text-blue-500" /> CSV (for Google Sheets)
          </button>
        </div>
      )}
    </div>
  )
}

export default ExportMenu