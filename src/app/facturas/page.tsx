'use client'
import { useState, useRef } from 'react'
import { Upload, FileImage, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { MESES, formatGsCompleto } from '@/lib/datos-demo'

const PERSONAS = ['Augusto','Miska','Niños','Casa','Familia']
const CONCEPTOS = [
  'Alimentación','Combustible','Salud','Educación','Entretenimiento',
  'Transporte','Ropa','Hogar','Tecnología','Servicios','Transferencia','Otro'
]

type OcrResult = {
  monto: number
  proveedor: string
  fecha: string
  tipo: string
  persona_sugerida: string
  concepto_sugerido: string
  referencia?: string
}

export default function FacturasPage() {
  const [imagen, setImagen] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [ocr, setOcr] = useState<OcrResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Form fields (prellenados por OCR, editables)
  const [monto, setMonto] = useState('')
  const [persona, setPersona] = useState('')
  const [concepto, setConcepto] = useState('')
  const [fecha, setFecha] = useState('')
  const [nota, setNota] = useState('')

  function handleFile(file: File) {
    setImagen(file)
    setOcr(null)
    setError(null)
    setGuardado(false)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function procesarOcr() {
    if (!imagen) return
    setCargando(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', imagen)
      const res = await fetch('/api/ocr', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Error procesando imagen')
      const data: OcrResult = await res.json()
      setOcr(data)
      setMonto(String(data.monto))
      setPersona(data.persona_sugerida || '')
      setConcepto(data.concepto_sugerido || '')
      setFecha(data.fecha || new Date().toISOString().split('T')[0])
      setNota(data.proveedor || '')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al procesar la imagen')
    } finally {
      setCargando(false)
    }
  }

  async function guardarGasto() {
    setGuardado(true)
    // TODO: guardar en Supabase
  }

  const mesActual = MESES[new Date().getMonth()]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Subir comprobante</h2>
        <p className="text-sm text-gray-500 mt-1">Ticket, factura o transferencia — Claude lo lee automáticamente</p>
      </div>

      {/* Zona de drop */}
      {!imagen ? (
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
        >
          <Upload className="mx-auto mb-3 text-gray-300" size={40}/>
          <p className="font-medium text-gray-500">Arrastrá la foto o hacé click para subir</p>
          <p className="text-sm text-gray-400 mt-1">Ticket, factura, captura de transferencia, comprobante de pago</p>
          <p className="text-xs text-gray-300 mt-2">JPG, PNG, PDF · máx 10MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex gap-4 items-start">
            {preview && (
              <img src={preview} alt="Comprobante" className="w-32 h-40 object-contain rounded-lg border border-gray-100 bg-gray-50"/>
            )}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <FileImage size={16} className="text-blue-500"/>
                <span className="text-sm font-medium text-gray-700 truncate">{imagen.name}</span>
              </div>
              {!ocr && !cargando && (
                <button
                  onClick={procesarOcr}
                  className="bg-[#2C3E50] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#34495E] transition-colors"
                >
                  Analizar con Claude Haiku
                </button>
              )}
              {cargando && (
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <Loader2 className="animate-spin" size={16}/>
                  Claude está leyendo el comprobante…
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
                  <AlertCircle size={15}/>
                  {error}
                </div>
              )}
              {ocr && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm">
                  <CheckCircle size={15}/>
                  Datos extraídos · revisá y confirmá
                </div>
              )}
              <button
                onClick={() => { setImagen(null); setPreview(null); setOcr(null); setGuardado(false) }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cambiar imagen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de confirmación */}
      {(ocr || imagen) && !guardado && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-700">
            {ocr ? 'Revisá y confirmá los datos' : 'Cargá los datos del comprobante'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto (₲)</label>
              <input
                type="text"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="ej: 104000"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
              <select
                value={persona}
                onChange={e => setPersona(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Seleccioná</option>
                {PERSONAS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={concepto}
                onChange={e => setConcepto(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Seleccioná</option>
                {CONCEPTOS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nota / beneficiario</label>
              <input
                type="text"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="ej: Gregorio Insfran"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          <button
            onClick={guardarGasto}
            disabled={!monto || !persona}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Guardar gasto
          </button>
        </div>
      )}

      {guardado && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <CheckCircle className="mx-auto text-emerald-500 mb-2" size={32}/>
          <p className="font-bold text-emerald-800">¡Gasto guardado!</p>
          <p className="text-sm text-emerald-600 mt-1">
            {formatGsCompleto(parseInt(monto))} · {persona} · {concepto}
          </p>
          <button
            onClick={() => { setImagen(null); setPreview(null); setOcr(null); setGuardado(false); setMonto(''); setPersona(''); setConcepto(''); }}
            className="mt-4 text-sm text-emerald-700 underline"
          >
            Subir otro comprobante
          </button>
        </div>
      )}
    </div>
  )
}
