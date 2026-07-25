'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle, Loader2, X, CreditCard } from 'lucide-react'
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
  fecha_vencimiento?: string
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
  const [gastoEditando, setGastoEditando] = useState<Gasto | null>(null)
  const [cuotaActual, setCuotaActual] = useState('')
  const [cuotasTotal, setCuotasTotal] = useState('')
  const [fechaVenc, setFechaVenc] = useState('')
  const [guardandoCuota, setGuardandoCuota] = useState(false)
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

  function abrirEdicion(g: Gasto) {
    setGastoEditando(g)
    setCuotaActual(g.cuota_actual ? String(g.cuota_actual) : '')
    setCuotasTotal(g.cuotas_total ? String(g.cuotas_total) : '')
    setFechaVenc(g.fecha_vencimiento ?? '')
  }

  async function guardarCuota() {
    if (!gastoEditando) return
    setGuardandoCuota(true)
    await fetch(`/api/gastos/${gastoEditando.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cuota_actual: cuotaActual ? parseInt(cuotaActual) : null,
        cuotas_total: cuotasTotal ? parseInt(cuotasTotal) : null,
        fecha_vencimiento: fechaVenc || null,
      }),
    })
    setGuardandoCuota(false)
    setGastoEditando(null)
    cargarGastos()
  }

  const totalMes = gastos.reduce((s, g) => s + g.monto, 0)

  return (
    <div className="space-y-4 md:space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Gastos</h2>
          <p className="text-sm text-gray-500 mt-1">Historial y registro manual</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#2C3E50] text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-[#34495E] transition-colors active:scale-95"
        >
          <Plus size={18}/> Nuevo gasto
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-blue-100 space-y-4">
          <h3 className="font-semibold text-gray-700">Registrar gasto</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto (₲)</label>
              <input
                type="number"
                inputMode="numeric"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="ej: 150000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
                <select
                  value={persona}
                  onChange={e => { setPersona(e.target.value); setConcepto('') }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
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
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-40"
                  disabled={!persona}
                >
                  <option value="">Seleccioná</option>
                  {conceptos.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  placeholder="Descripción breve"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          </div>
          {guardado ? (
            <div className="flex items-center gap-2 text-emerald-600 font-semibold py-1">
              <CheckCircle size={18}/> ¡Guardado!
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={guardar}
                disabled={!monto || !persona || !concepto || guardando}
                className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-emerald-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95"
              >
                {guardando && <Loader2 size={18} className="animate-spin"/>}
                Guardar
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-base"
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
              <div
                key={g.id}
                className="px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => abrirEdicion(g)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{g.conceptos?.nombre ?? '—'}</span>
                    {g.cuota_actual && g.cuotas_total && (
                      <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-medium">
                        cuota {g.cuota_actual}/{g.cuotas_total}
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
      {/* Modal edición de cuota */}
      {gastoEditando && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{gastoEditando.conceptos?.nombre ?? '—'}</h3>
                <p className="text-sm text-gray-400 mt-0.5">{formatGsCompleto(gastoEditando.monto)} · <span style={{ color: gastoEditando.personas?.color }}>{gastoEditando.personas?.nombre}</span></p>
              </div>
              <button onClick={() => setGastoEditando(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20}/>
              </button>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                <CreditCard size={16}/> Cuota de crédito y vencimiento
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cuota actual</label>
                  <input
                    type="number"
                    min="1"
                    value={cuotaActual}
                    onChange={e => setCuotaActual(e.target.value)}
                    placeholder="ej: 25"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Total de cuotas</label>
                  <input
                    type="number"
                    min="1"
                    value={cuotasTotal}
                    onChange={e => setCuotasTotal(e.target.value)}
                    placeholder="ej: 60"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
              {cuotaActual && cuotasTotal && (
                <p className="text-xs text-blue-600 text-center">
                  Cuota {cuotaActual} de {cuotasTotal} · quedan {parseInt(cuotasTotal) - parseInt(cuotaActual)} cuotas
                </p>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha de vencimiento</label>
                <input
                  type="date"
                  value={fechaVenc}
                  onChange={e => setFechaVenc(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <p className="text-xs text-gray-400 mt-1">El dashboard te avisará 15 días antes</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={guardarCuota}
                disabled={guardandoCuota}
                className="flex-1 bg-[#2C3E50] text-white py-2.5 rounded-lg font-semibold hover:bg-[#34495E] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {guardandoCuota ? <Loader2 size={16} className="animate-spin"/> : null}
                Guardar
              </button>
              {(gastoEditando.cuota_actual || gastoEditando.cuotas_total) && (
                <button
                  onClick={async () => {
                    await fetch(`/api/gastos/${gastoEditando.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ cuota_actual: null, cuotas_total: null }),
                    })
                    setGastoEditando(null)
                    cargarGastos()
                  }}
                  className="px-4 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 text-sm"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
