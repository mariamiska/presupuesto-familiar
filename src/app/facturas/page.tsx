/* eslint-disable @next/next/no-img-element */
'use client'
import { useState, useRef } from 'react'
import { Upload, FileImage, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { formatGsCompleto } from '@/lib/datos-demo'

const PERSONAS = ['Augusto','Miska','Niños','Casa','Familia']
const CONCEPTOS = [
  'Alimentación','Combustible','Salud','Educación','Entretenimiento',
  'Transporte','Ropa','Hogar','Tecnología','Servicios','Transferencia','Otro'
]

function parsearTextoOcr(texto: string) {
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean)
  const todo = texto.toLowerCase()

  // Monto: buscar número grande (guaraníes suelen ser 5+ dígitos)
  let monto = ''
  // Patrones comunes en comprobantes paraguayos
  const patronesMonto = [
    /(?:monto|importe|total|gs\.?|₲)\s*[:\.]?\s*([\d.,]+)/i,
    /(?:transferencia exitosa|transferido)\s*[\w\s]*\s*([\d.,]+)/i,
    /\b([\d]{1,3}(?:[.,][\d]{3})+)\b/, // número con separadores tipo 1.234.567
  ]
  for (const p of patronesMonto) {
    const m = texto.match(p)
    if (m) {
      monto = m[1].replace(/\./g, '').replace(/,/g, '')
      if (monto.length >= 4) break
    }
  }

  // Fecha: buscar DD/MM/YYYY o YYYY-MM-DD
  let fecha = ''
  const mFecha = texto.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/) ||
                 texto.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/)
  if (mFecha) {
    const f = mFecha[0]
    if (f.match(/^\d{4}/)) {
      fecha = f.replace(/\//g, '-')
    } else {
      const [, d, m, y] = f.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/) || []
      if (d && m && y) fecha = `${y}-${m}-${d}`
    }
  }
  if (!fecha) fecha = new Date().toISOString().split('T')[0]

  // Proveedor / beneficiario
  let proveedor = ''
  for (const linea of lineas) {
    if (/beneficiario|destinatario|a favor de|proveedor/i.test(linea)) {
      proveedor = linea.replace(/.*?:\s*/, '').trim()
      break
    }
  }

  // Concepto sugerido
  let concepto = ''
  if (/transfer|envio|env[ií]o/i.test(todo)) concepto = 'Transferencia'
  else if (/farmac|medicam|salud|clinic|hospital|doctor/i.test(todo)) concepto = 'Salud'
  else if (/superm|almac|aliment|comida|market/i.test(todo)) concepto = 'Alimentación'
  else if (/combusti|nafta|gasolina|petro/i.test(todo)) concepto = 'Combustible'
  else if (/colegio|escuela|educac|univers/i.test(todo)) concepto = 'Educación'
  else if (/ande|copaco|essap|servicio|luz|agua|gas\b/i.test(todo)) concepto = 'Servicios'
  else if (/taxi|uber|transport|bus\b/i.test(todo)) concepto = 'Transporte'
  else concepto = ''

  return { monto, fecha, proveedor, concepto }
}

export default function FacturasPage() {
  const [imagen, setImagen] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [ocrHecho, setOcrHecho] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [monto, setMonto] = useState('')
  const [persona, setPersona] = useState('')
  const [concepto, setConcepto] = useState('')
  const [fecha, setFecha] = useState('')
  const [nota, setNota] = useState('')

  async function handleFile(file: File) {
    setImagen(file)
    setOcrHecho(false)
    setError(null)
    setGuardado(false)
    setMonto(''); setPersona(''); setConcepto(''); setFecha(''); setNota('')
    const url = URL.createObjectURL(file)
    setPreview(url)

    setCargando(true)
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('spa+eng')
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()

      const parsed = parsearTextoOcr(text)
      setMonto(parsed.monto)
      setFecha(parsed.fecha)
      setNota(parsed.proveedor)
      setConcepto(parsed.concepto)
      setOcrHecho(true)
    } catch (e: unknown) {
      // Si Tesseract falla, igual mostramos el formulario vacío
      console.error('OCR error:', e)
      setFecha(new Date().toISOString().split('T')[0])
      setOcrHecho(true)
    } finally {
      setCargando(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function reset() {
    setImagen(null); setPreview(null); setOcrHecho(false)
    setGuardado(false); setMonto(''); setPersona(''); setConcepto('')
    setFecha(''); setNota(''); setError(null)
  }

  async function guardarGasto() {
    const res = await fetch('/api/gastos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha,
        persona_nombre: persona,
        concepto_nombre: concepto || 'Otro',
        monto,
        nota,
        fuente: 'ocr',
      }),
    })
    if (res.ok) setGuardado(true)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Subir comprobante</h2>
        <p className="text-sm text-gray-500 mt-1">Ticket, factura o transferencia — se lee automáticamente</p>
      </div>

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
          <p className="text-xs text-gray-300 mt-2">JPG, PNG · máx 10MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex gap-4 items-start">
            {preview && (
              <img src={preview} alt="Comprobante" className="w-32 h-40 object-contain rounded-lg border border-gray-100 bg-gray-50"/>
            )}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <FileImage size={16} className="text-blue-500"/>
                <span className="text-sm font-medium text-gray-700 truncate">{imagen.name}</span>
              </div>
              {cargando && (
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <Loader2 className="animate-spin" size={16}/>
                  Leyendo el comprobante…
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
                  <AlertCircle size={15}/>
                  {error}
                </div>
              )}
              {ocrHecho && !cargando && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm">
                  <CheckCircle size={15}/>
                  {monto ? 'Datos extraídos · revisá y completá lo que falta' : 'Completá los datos manualmente'}
                </div>
              )}
              <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">
                Cambiar imagen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario — visible apenas se sube la imagen, aunque OCR no terminó */}
      {imagen && !guardado && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-700">
            {ocrHecho && monto ? 'Revisá y confirmá los datos' : 'Completá los datos del comprobante'}
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
            disabled={!monto || !persona || cargando}
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
          <button onClick={reset} className="mt-4 text-sm text-emerald-700 underline">
            Subir otro comprobante
          </button>
        </div>
      )}
    </div>
  )
}
