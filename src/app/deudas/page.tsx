'use client'
import { useState, useEffect } from 'react'
import { TrendingDown, Plus, X, Loader2, CheckCircle, Trash2 } from 'lucide-react'
import { formatGsCompleto } from '@/lib/supabase'

const PERSONAS = ['Augusto', 'Miska', 'Niños', 'Casa', 'Familia']
const TIPOS = ['prestamo', 'tarjeta', 'otra'] as const
const TIPO_LABEL: Record<string, string> = { prestamo: 'Préstamo', tarjeta: 'Tarjeta', otra: 'Otra' }

type DeudaDB = {
  id: string
  nombre: string
  tipo: 'prestamo' | 'tarjeta' | 'otra'
  persona_id: string
  capital_inicial?: number
  saldo_actual: number
  tasa_anual?: number
  cuota_mensual?: number
  cuotas_totales?: number
  cuotas_pagadas?: number
  activa: boolean
  personas?: { nombre: string; color: string }
}

function calcularEstrategia(deudas: DeudaDB[], extraMes: number, tipo: 'avalancha' | 'bola') {
  let lista = deudas.map(d => ({ ...d }))
  if (tipo === 'avalancha') lista.sort((a, b) => (b.tasa_anual ?? 0) - (a.tasa_anual ?? 0))
  else lista.sort((a, b) => a.saldo_actual - b.saldo_actual)

  let meses = 0
  let interesesTotal = 0
  const MAX = 360

  while (lista.some(d => d.saldo_actual > 0) && meses < MAX) {
    meses++
    let extraDisp = extraMes
    lista = lista.map((d, i) => {
      if (d.saldo_actual <= 0) return d
      const interes = ((d.saldo_actual * (d.tasa_anual ?? 0)) / 100) / 12
      interesesTotal += interes
      let pago = d.cuota_mensual ?? 0
      if (extraDisp > 0 && i === 0) { pago += extraDisp; extraDisp = 0 }
      return { ...d, saldo_actual: Math.max(0, d.saldo_actual - pago + interes) }
    })
  }
  return { meses, interesesTotal: Math.round(interesesTotal) }
}

export default function DeudasPage() {
  const [deudas, setDeudas] = useState<DeudaDB[]>([])
  const [cargando, setCargando] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [extra, setExtra] = useState('500000')

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<'prestamo' | 'tarjeta' | 'otra'>('prestamo')
  const [persona, setPersona] = useState('Augusto')
  const [capitalInicial, setCapitalInicial] = useState('')
  const [saldoActual, setSaldoActual] = useState('')
  const [tasaAnual, setTasaAnual] = useState('')
  const [cuotaMensual, setCuotaMensual] = useState('')
  const [cuotasTotales, setCuotasTotales] = useState('')
  const [cuotasPagadas, setCuotasPagadas] = useState('')

  async function cargarDeudas() {
    setCargando(true)
    const res = await fetch('/api/deudas')
    const data = await res.json()
    setDeudas(Array.isArray(data) ? data : [])
    setCargando(false)
  }

  useEffect(() => { cargarDeudas() }, [])

  function limpiarForm() {
    setNombre(''); setTipo('prestamo'); setPersona('Augusto')
    setCapitalInicial(''); setSaldoActual(''); setTasaAnual('')
    setCuotaMensual(''); setCuotasTotales(''); setCuotasPagadas('')
  }

  async function guardar() {
    if (!nombre || !saldoActual) return
    setGuardando(true)
    const res = await fetch('/api/deudas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        tipo,
        persona_nombre: persona,
        capital_inicial: capitalInicial ? parseInt(capitalInicial.replace(/\D/g, '')) : null,
        saldo_actual: parseInt(saldoActual.replace(/\D/g, '')),
        tasa_anual: tasaAnual ? parseFloat(tasaAnual) : null,
        cuota_mensual: cuotaMensual ? parseInt(cuotaMensual.replace(/\D/g, '')) : null,
        cuotas_totales: cuotasTotales ? parseInt(cuotasTotales) : null,
        cuotas_pagadas: cuotasPagadas ? parseInt(cuotasPagadas) : null,
      }),
    })
    if (res.ok) {
      setGuardado(true)
      limpiarForm()
      setShowForm(false)
      await cargarDeudas()
      setTimeout(() => setGuardado(false), 2000)
    }
    setGuardando(false)
  }

  async function actualizarCuota(id: string, pagadas: number) {
    await fetch(`/api/deudas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cuotas_pagadas: pagadas }),
    })
    await cargarDeudas()
  }

  async function archivar(id: string) {
    if (!confirm('¿Archivar esta deuda?')) return
    await fetch(`/api/deudas/${id}`, { method: 'DELETE' })
    await cargarDeudas()
  }

  const extraNum = parseInt(extra.replace(/\D/g, '')) || 0
  const totalDeuda = deudas.reduce((s, d) => s + d.saldo_actual, 0)
  const totalCuota = deudas.reduce((s, d) => s + (d.cuota_mensual ?? 0), 0)
  const deudasConTasa = deudas.filter(d => d.tasa_anual && d.cuota_mensual)
  const avalancha = deudasConTasa.length ? calcularEstrategia(deudasConTasa, extraNum, 'avalancha') : null
  const bola = deudasConTasa.length ? calcularEstrategia(deudasConTasa, extraNum, 'bola') : null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Panel de Deudas</h2>
          <p className="text-sm text-gray-500 mt-1">Seguimiento independiente del presupuesto mensual</p>
        </div>
        {guardado && (
          <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
            <CheckCircle size={16}/> Guardado
          </span>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total deuda</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatGsCompleto(totalDeuda)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Cuota mensual total</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{formatGsCompleto(totalCuota)}</p>
        </div>
      </div>

      {/* Lista de deudas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Mis deudas</h3>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showForm ? <X size={15}/> : <Plus size={15}/>}
            {showForm ? 'Cancelar' : 'Agregar'}
          </button>
        </div>

        {/* Formulario nueva deuda */}
        {showForm && (
          <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                <input
                  value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Préstamo Auto"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value as typeof tipo)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Persona</label>
                <select value={persona} onChange={e => setPersona(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {PERSONAS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Saldo actual (₲) *</label>
                <input
                  value={saldoActual} onChange={e => setSaldoActual(e.target.value)}
                  placeholder="88000000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Capital inicial (₲)</label>
                <input
                  value={capitalInicial} onChange={e => setCapitalInicial(e.target.value)}
                  placeholder="100000000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cuota mensual (₲)</label>
                <input
                  value={cuotaMensual} onChange={e => setCuotaMensual(e.target.value)}
                  placeholder="2524831"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tasa anual (%)</label>
                <input
                  value={tasaAnual} onChange={e => setTasaAnual(e.target.value)}
                  placeholder="18"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cuotas pagadas / totales</label>
                <div className="flex gap-2">
                  <input
                    value={cuotasPagadas} onChange={e => setCuotasPagadas(e.target.value)}
                    placeholder="25"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <span className="self-center text-gray-400">/</span>
                  <input
                    value={cuotasTotales} onChange={e => setCuotasTotales(e.target.value)}
                    placeholder="60"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={guardar}
              disabled={guardando || !nombre || !saldoActual}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {guardando ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
              Guardar deuda
            </button>
          </div>
        )}

        {/* Lista */}
        {cargando ? (
          <div className="flex justify-center py-10 text-gray-400">
            <Loader2 className="animate-spin" size={24}/>
          </div>
        ) : deudas.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No hay deudas registradas. Agregá una arriba.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {deudas.map(d => {
              const pct = d.cuotas_totales && d.cuotas_pagadas != null
                ? Math.round((d.cuotas_pagadas / d.cuotas_totales) * 100)
                : null
              const color = d.personas?.color ?? '#6B7280'
              return (
                <div key={d.id} className="px-5 py-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold" style={{ color }}>{d.nombre}</p>
                      <p className="text-xs text-gray-400">
                        {d.personas?.nombre ?? '—'} · {TIPO_LABEL[d.tipo]}
                        {d.tasa_anual ? ` · ${d.tasa_anual}% anual` : ''}
                        {d.cuota_mensual ? ` · cuota ${formatGsCompleto(d.cuota_mensual)}/mes` : ''}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{formatGsCompleto(d.saldo_actual)}</p>
                        {d.cuotas_totales && d.cuotas_pagadas != null && (
                          <p className="text-xs text-gray-400">{d.cuotas_pagadas}/{d.cuotas_totales} cuotas</p>
                        )}
                      </div>
                      <button onClick={() => archivar(d.id)} className="text-gray-300 hover:text-red-400 mt-0.5">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                  {pct !== null && (
                    <>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }}/>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-400">{pct}% pagado</p>
                        {d.cuotas_pagadas != null && d.cuotas_totales && d.cuotas_pagadas < d.cuotas_totales && (
                          <button
                            onClick={() => actualizarCuota(d.id, (d.cuotas_pagadas ?? 0) + 1)}
                            className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                          >
                            + registrar cuota pagada
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Simulador */}
      {deudasConTasa.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <TrendingDown size={18} className="text-blue-600"/> Simulador de pago acelerado
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto extra disponible por mes (₲)
            </label>
            <input
              type="text"
              value={extra}
              onChange={e => setExtra(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2.5 w-48 focus:outline-none focus:ring-2 focus:ring-blue-300 font-bold"
            />
          </div>
          {avalancha && bola && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                  🏦 Avalancha (mayor interés primero)
                </p>
                <p className="text-2xl font-bold text-blue-800">{avalancha.meses} meses</p>
                <p className="text-xs text-blue-600 mt-1">Intereses: {formatGsCompleto(avalancha.interesesTotal)}</p>
                {bola.interesesTotal > avalancha.interesesTotal && (
                  <p className="text-xs text-emerald-700 font-semibold mt-1">
                    Ahorrás {formatGsCompleto(bola.interesesTotal - avalancha.interesesTotal)} vs bola de nieve
                  </p>
                )}
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">
                  ⛄ Bola de nieve (menor saldo primero)
                </p>
                <p className="text-2xl font-bold text-purple-800">{bola.meses} meses</p>
                <p className="text-xs text-purple-600 mt-1">Intereses: {formatGsCompleto(bola.interesesTotal)}</p>
                <p className="text-xs text-gray-500 mt-1">Eliminás una deuda más rápido</p>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400">
            * Solo incluye deudas con tasa y cuota cargadas. Simulación aproximada.
          </p>
        </div>
      )}
    </div>
  )
}
