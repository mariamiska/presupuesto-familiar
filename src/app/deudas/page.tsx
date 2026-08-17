'use client'
import { useState, useEffect, useRef } from 'react'
import { TrendingDown, Plus, X, Loader2, CheckCircle, Trash2, Pencil, FileText } from 'lucide-react'
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
  fecha_vencimiento?: string
  activa: boolean
  personas?: { nombre: string; color: string }
  fuente?: 'deuda' | 'gasto'
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

  const [editando, setEditando] = useState<DeudaDB | null>(null)
  const [editSaldo, setEditSaldo] = useState('')
  const [editCuotasPagadas, setEditCuotasPagadas] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [parseandoPDF, setParseandoPDF] = useState(false)
  const [pdfParseado, setPdfParseado] = useState<{
    cuotas_pagadas: number; saldo_actual: number; tasa_anual: number;
    proxima_cuota?: { numero: number; vencimiento: string; monto: number }
  } | null>(null)

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

  function abrirEdicion(d: DeudaDB) {
    setEditando(d)
    setEditSaldo(String(d.saldo_actual))
    setEditCuotasPagadas(d.cuotas_pagadas != null ? String(d.cuotas_pagadas) : '')
    setPdfParseado(null)
  }

  async function subirPlanPagos(file: File) {
    setParseandoPDF(true)
    setPdfParseado(null)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/deudas/importar-plan', { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok) {
      setPdfParseado(data)
      setEditSaldo(String(data.saldo_actual))
      setEditCuotasPagadas(String(data.cuotas_pagadas))
    }
    setParseandoPDF(false)
  }

  async function guardarEdicion() {
    if (!editando) return
    setGuardandoEdit(true)
    const saldo = parseInt(editSaldo.replace(/\D/g, ''))
    const pagadas = editCuotasPagadas ? parseInt(editCuotasPagadas) : null

    if (editando.fuente === 'gasto') {
      // Promover a deuda explícita con el saldo real del banco
      await fetch('/api/deudas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editando.nombre,
          tipo: editando.tipo,
          persona_id: editando.persona_id,
          saldo_actual: saldo,
          cuota_mensual: editando.cuota_mensual,
          cuotas_totales: editando.cuotas_totales,
          cuotas_pagadas: pagadas,
          fecha_vencimiento: editando.fecha_vencimiento,
          _skip_persona_lookup: true,
        }),
      })
    } else {
      await fetch(`/api/deudas/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saldo_actual: saldo,
          cuotas_pagadas: pagadas,
          ...(pdfParseado?.tasa_anual ? { tasa_anual: pdfParseado.tasa_anual } : {}),
        }),
      })
    }
    setGuardandoEdit(false)
    setEditando(null)
    await cargarDeudas()
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
            <p className="text-xs text-blue-600 bg-blue-100 rounded-lg px-3 py-2">
              💡 Si ya registrás las cuotas en <strong>Gastos</strong>, usá el mismo nombre del concepto — este saldo real reemplazará el saldo estimado automáticamente.
            </p>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold" style={{ color }}>{d.nombre}</p>
                        {d.fuente === 'gasto' && (
                          <button
                            onClick={() => abrirEdicion(d)}
                            className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded hover:bg-amber-100 font-medium"
                          >
                            saldo estimado · fijar real →
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {d.personas?.nombre ?? '—'} · {TIPO_LABEL[d.tipo] ?? '—'}
                        {d.tasa_anual ? ` · ${d.tasa_anual}% anual` : ''}
                        {d.cuota_mensual ? ` · cuota ${formatGsCompleto(d.cuota_mensual)}/mes` : ''}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-right">
                        {d.saldo_actual > 0
                          ? <p className="font-bold text-gray-800">{formatGsCompleto(d.saldo_actual)}</p>
                          : <p className="text-xs text-gray-400 italic">saldo N/D</p>
                        }
                        {d.cuotas_totales && d.cuotas_pagadas != null && (
                          <p className="text-xs text-gray-400">{d.cuotas_pagadas}/{d.cuotas_totales} cuotas</p>
                        )}
                        {d.fecha_vencimiento && (
                          <p className="text-xs text-orange-400">vence {new Date(d.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-PY')}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {d.fuente === 'deuda' && (
                          <button onClick={() => abrirEdicion(d)} className="text-gray-300 hover:text-blue-400">
                            <Pencil size={14}/>
                          </button>
                        )}
                        {d.fuente === 'deuda' && (
                          <button onClick={() => archivar(d.id)} className="text-gray-300 hover:text-red-400">
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </div>
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

      {/* Modal edición rápida */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">
                {editando.fuente === 'gasto' ? 'Fijar saldo real' : 'Actualizar deuda'}
              </h3>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20}/>
              </button>
            </div>
            <p className="px-5 text-sm text-gray-500">{editando.nombre}</p>
            {editando.fuente === 'gasto' && (
              <div className="mx-5 mt-3 mb-1 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
                <p className="font-semibold">Saldo estimado: {formatGsCompleto(editando.saldo_actual)}</p>
                <p>Este saldo se calcula como cuota × cuotas restantes. Ingresá el saldo real según el banco para mayor precisión — se guardará como deuda explícita y reemplazará este estimado.</p>
              </div>
            )}
            <div className="mb-3"/>
            <div className="px-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Saldo actual según el banco (₲)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editSaldo}
                  onChange={e => setEditSaldo(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              {editando.cuotas_totales && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Cuotas pagadas (de {editando.cuotas_totales})
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={editando.cuotas_totales}
                    value={editCuotasPagadas}
                    onChange={e => setEditCuotasPagadas(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              )}
            </div>
            {/* Upload plan de pagos PDF */}
            <div className="px-5 pb-2">
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) subirPlanPagos(f) }}
              />
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={parseandoPDF}
                className="w-full border border-dashed border-blue-300 text-blue-600 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {parseandoPDF
                  ? <><Loader2 size={15} className="animate-spin"/> Analizando PDF...</>
                  : <><FileText size={15}/> Subir plan de pagos del banco (PDF)</>
                }
              </button>
              {pdfParseado && (
                <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
                  <p className="font-semibold text-emerald-700">Datos extraídos del PDF:</p>
                  <p className="text-emerald-600">· Cuotas pagadas: <strong>{pdfParseado.cuotas_pagadas}</strong> de {editando?.cuotas_totales}</p>
                  <p className="text-emerald-600">· Saldo capital restante: <strong>{formatGsCompleto(pdfParseado.saldo_actual)}</strong></p>
                  {pdfParseado.tasa_anual && <p className="text-emerald-600">· Tasa anual: <strong>{pdfParseado.tasa_anual}%</strong></p>}
                  {pdfParseado.proxima_cuota && (
                    <p className="text-emerald-600">· Próxima cuota #{pdfParseado.proxima_cuota.numero}: {formatGsCompleto(pdfParseado.proxima_cuota.monto)} el {new Date(pdfParseado.proxima_cuota.vencimiento + 'T12:00:00').toLocaleDateString('es-PY')}</p>
                  )}
                  <p className="text-emerald-500 italic">Los campos de arriba se actualizaron automáticamente.</p>
                </div>
              )}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={guardarEdicion}
                disabled={guardandoEdit || !editSaldo}
                className="w-full bg-[#2C3E50] text-white py-3 rounded-xl font-semibold hover:bg-[#34495E] disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {guardandoEdit ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle size={16}/>}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

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
