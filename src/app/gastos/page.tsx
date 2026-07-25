'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle, Loader2 } from 'lucide-react'
import { MESES, formatGsCompleto } from '@/lib/supabase'

const PERSONAS = ['Augusto','Miska','Niños','Casa','Familia']
const CONCEPTOS_POR_PERSONA: Record<string, string[]> = {
  Augusto: ['Préstamo Auto','Combustible','Telefonía','Seguro Auto','TC Crunchy','TC Spotify','Comercial','Ropa','Salud','Otro'],
  Miska:   ['Sueldo extra','Ropa','Salud','Belleza','Entretenimiento','Educación','Otro'],
  Niños:   ['Cantina','Escuela','Ropa','Útiles','Deporte','Actividades','Otro'],
  Casa:    ['Supermercado','Luz','Agua','Gas','Internet','Alquiler','Mantenimiento','Otro'],
  Familia: ['Salidas','Viajes','Regalos','Eventos','Otro'],
}
const FUENTE_LABEL: Record<string, string> = { manual: '✏️', ocr: '📷', whatsapp: '💬', email: '📧' }

type Gasto = {
  id: string
  fecha: string
  monto: number
  nota?: string
  fuente: string
  cuota_actual?: number
  cuotas_total?: number
  personas?: { nombre: string; color: string }
  conceptos?: { nombre: string }
}

const mesActual = new Date().getMonth() + 1

export default function GastosPage() {
  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [persona, setPersona] = useState('')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [nota, setNota] = useState('')
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActual)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [cargando, setCargando] = useState(true)
  const conceptos = persona ? (CONCEPTOS_POR_PERSONA[persona] || []) : []

  const cargarGastos = useCallback(async () => {
    setCargando(true)
    const res = await fetch(`/api/gastos?mes=${mesSeleccionado}`)
    const data = await res.json()
    setGastos(Array.isArray(data) ? data : [])
    setCargando(false)
  }, [mesSeleccionado])

  useEffect(() => { cargarGastos() }, [cargarGastos])

  async function guardar() {
    if (!monto || !persona || !concepto) return
    setGuardando(true)
    const res = await fetch('/api/gastos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, persona_nombre: persona, concepto_nombre: concepto, monto, nota, fuente: 'manual' }),
    })
    setGuardando(false)
    if (res.ok) {
      setGuardado(true)
      setTimeout(() => { setGuardado(false); setShowForm(false); setMonto(''); setNota(''); setPersona(''); setConcepto('') }, 1500)
      cargarGastos()
    }
  }

  const totalMes = gastos.reduce((s, g) => s + g.monto, 0)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gastos</h2>
          <p className="text-sm text-gray-500 mt-1">Historial y registro manual</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#2C3E50] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#34495E] transition-colors"
        >
          <Plus size={16}/> Nuevo gasto
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100 space-y-4">
          <h3 className="font-semibold text-gray-700">Registrar gasto</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto (₲)</label>
              <input
                type="number"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="ej: 150000"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
              <select
                value={persona}
                onChange={e => { setPersona(e.target.value); setConcepto('') }}
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
                disabled={!persona}
              >
                <option value="">Seleccioná</option>
                {conceptos.map(c => <option key={c}>{c}</option>)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
              <input
                type="text"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Descripción breve"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          {guardado ? (
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <CheckCircle size={18}/> ¡Guardado!
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={guardar}
                disabled={!monto || !persona || !concepto || guardando}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {guardando && <Loader2 size={16} className="animate-spin"/>}
                Guardar
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-700">Gastos del mes</h3>
            {!cargando && gastos.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">Total: {formatGsCompleto(totalMes)}</p>
            )}
          </div>
          <select
            value={mesSeleccionado}
            onChange={e => setMesSeleccionado(parseInt(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            {MESES.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 className="animate-spin" size={18}/> Cargando...
          </div>
        ) : gastos.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            Sin gastos para {MESES[mesSeleccionado - 1]}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {gastos.map(g => (
              <div key={g.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{g.conceptos?.nombre ?? '—'}</span>
                    {g.cuota_actual && g.cuotas_total && (
                      <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-medium">
                        {g.cuota_actual}/{g.cuotas_total}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{FUENTE_LABEL[g.fuente] ?? ''}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span style={{ color: g.personas?.color }}>{g.personas?.nombre}</span>
                    {' · '}{new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-PY')}
                    {g.nota && ` · ${g.nota}`}
                  </p>
                </div>
                <span className="font-bold text-gray-800">{formatGsCompleto(g.monto)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
