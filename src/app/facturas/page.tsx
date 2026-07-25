/* eslint-disable @next/next/no-img-element */
'use client'
import { useState, useRef, useEffect } from 'react'
import { Camera, ImageIcon, CheckCircle, Loader2, AlertCircle, X } from 'lucide-react'
import { formatGsCompleto } from '@/lib/datos-demo'

type Persona = { id: string; nombre: string; color: string }
type Concepto = { id: string; nombre: string; persona_id: string }

const CONCEPTOS_FALLBACK = [
  'Alimentación','Combustible','Salud','Educación','Entretenimiento',
  'Transporte','Ropa','Hogar','Tecnología','Servicios','Transferencia','Otro'
]

function parsearTextoOcr(texto: string) {
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean)
  const todo = texto.toLowerCase()

  let monto = ''
  const patronesMonto = [
    /(?:monto|importe|total|gs\.?|₲)\s*[:\.]?\s*([\d.,]+)/i,
    /(?:transferencia exitosa|transferido)\s*[\w\s]*\s*([\d.,]+)/i,
    /\b([\d]{1,3}(?:[.,][\d]{3})+)\b/,
  ]
  for (const p of patronesMonto) {
    const m = texto.match(p)
    if (m) {
      monto = m[1].replace(/\./g, '').replace(/,/g, '')
      if (monto.length >= 4) break
    }
  }

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

  let proveedor = ''
  for (const linea of lineas) {
    if (/beneficiario|destinatario|a favor de|proveedor/i.test(linea)) {
      proveedor = linea.replace(/.*?:\s*/, '').trim()
      break
    }
  }

  let concepto = ''
  if (/transfer|envio|env[ií]o/i.test(todo)) concepto = 'Transferencia'
  else if (/farmac|medicam|salud|clinic|hospital|doctor/i.test(todo)) concepto = 'Salud'
  else if (/superm|almac|aliment|comida|market/i.test(todo)) concepto = 'Alimentación'
  else if (/combusti|nafta|gasolina|petro/i.test(todo)) concepto = 'Combustible'
  else if (/colegio|escuela|educac|univers/i.test(todo)) concepto = 'Educación'
  else if (/ande|copaco|essap|servicio|luz|agua|gas\b/i.test(todo)) concepto = 'Servicios'
  else if (/taxi|uber|transport|bus\b/i.test(todo)) concepto = 'Transporte'

  return { monto, fecha, proveedor, concepto }
}

export default function FacturasPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [conceptos, setConceptos] = useState<Concepto[]>([])

  const [imagen, setImagen] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [ocrHecho, setOcrHecho] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const [monto, setMonto] = useState('')
  const [persona, setPersona] = useState('')
  const [concepto, setConcepto] = useState('')
  const [fecha, setFecha] = useState('')
  const [nota, setNota] = useState('')

  useEffect(() => {
    fetch('/api/personas').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPersonas(data)
    })
  }, [])

  useEffect(() => {
    if (!persona) { setConceptos([]); return }
    const p = personas.find(x => x.nombre === persona)
    if (!p) return
    fetch(`/api/conceptos?persona_id=${p.id}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setConceptos(data)
    })
  }, [persona, personas])

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
    const montoNum = parseInt(monto)
    if (!montoNum || montoNum <= 0) {
      setError('El monto debe ser mayor a cero.')
      return
    }
    if (!persona) {
      setError('Seleccioná una persona.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          persona_nombre: persona,
          concepto_nombre: concepto || 'Otro',
          monto: montoNum,
          nota,
          fuente: 'ocr',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'No se pudo guardar el gasto. Intentá de nuevo.')
      } else {
        setGuardado(true)
      }
    } catch {
      setError('Error de conexión. Verificá tu internet.')
    } finally {
      setGuardando(false)
    }
  }

  // Lista de categorías: de la DB si hay persona seleccionada, fallback a lista fija
  const categorias = conceptos.length > 0
    ? conceptos.map(c => c.nombre)
    : CONCEPTOS_FALLBACK

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Subir comprobante</h2>
        <p className="text-sm text-gray-500 mt-1">Foto del ticket o captura de transferencia</p>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {!imagen ? (
        <div className="space-y-3" onDrop={onDrop} onDragOver={e => e.preventDefault()}>
          <button
            onClick={() => cameraRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 bg-[#2C3E50] text-white py-5 rounded-2xl font-semibold text-base active:scale-[0.98] transition-transform shadow-md"
          >
            <Camera size={22}/> Sacar foto del comprobante
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 border-2 border-dashed border-gray-200 text-gray-500 py-4 rounded-2xl font-medium text-sm hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <ImageIcon size={18}/> Elegir de la galería
          </button>
          <p className="text-center text-xs text-gray-400">JPG, PNG · máx 10MB</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex gap-3 items-start">
              {preview && (
                <img src={preview} alt="Comprobante" className="w-20 h-24 object-cover rounded-xl border border-gray-100 bg-gray-50 shrink-0"/>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{imagen.name}</p>
                {cargando && (
                  <div className="flex items-center gap-2 text-blue-600 text-sm mt-2">
                    <Loader2 className="animate-spin shrink-0" size={15}/>
                    <span>Leyendo el comprobante…</span>
                  </div>
                )}
                {ocrHecho && !cargando && (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm mt-2">
                    <CheckCircle size={14} className="shrink-0"/>
                    <span>{monto ? 'Datos extraídos — revisá abajo' : 'Completá los datos'}</span>
                  </div>
                )}
              </div>
              <button onClick={reset} className="text-gray-300 hover:text-gray-500 shrink-0">
                <X size={18}/>
              </button>
            </div>
          </div>

          {!guardado && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm">
                {ocrHecho && monto ? 'Revisá y confirmá los datos' : 'Completá los datos'}
              </h3>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Monto (₲)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  placeholder="ej: 104000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Persona</label>
                  <select value={persona} onChange={e => setPersona(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300">
                    <option value="">Seleccioná</option>
                    {personas.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                  <select value={concepto} onChange={e => setConcepto(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300">
                    <option value="">Seleccioná</option>
                    {categorias.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nota / beneficiario</label>
                  <input type="text" value={nota} onChange={e => setNota(e.target.value)}
                    placeholder="ej: Farmacia"
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl p-3">
                  <AlertCircle size={15} className="shrink-0 mt-0.5"/>
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={guardarGasto}
                disabled={!monto || parseInt(monto) <= 0 || !persona || cargando || guardando}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-base hover:bg-emerald-700 transition-colors disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {guardando && <Loader2 size={18} className="animate-spin"/>}
                Guardar gasto
              </button>
            </div>
          )}
        </div>
      )}

      {guardado && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <CheckCircle className="mx-auto text-emerald-500 mb-3" size={40}/>
          <p className="font-bold text-emerald-800 text-lg">¡Gasto guardado!</p>
          <p className="text-sm text-emerald-600 mt-1">
            {formatGsCompleto(parseInt(monto))} · {persona} · {concepto}
          </p>
          <button onClick={reset} className="mt-5 w-full flex items-center justify-center gap-2 border-2 border-emerald-300 text-emerald-700 py-3 rounded-xl font-medium text-sm hover:bg-emerald-100 transition-colors">
            <Camera size={16}/> Subir otro comprobante
          </button>
        </div>
      )}
    </div>
  )
}
