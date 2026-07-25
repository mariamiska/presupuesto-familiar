'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle, Loader2, X, CreditCard, Trash2, Download, Search, Repeat2 } from 'lucide-react'
import { MESES, formatGsCompleto } from '@/lib/supabase'

type Persona = { id: string; nombre: string; color: string }
type Concepto = { id: string; nombre: string; persona_id: string }

const FUENTE_LABEL: Record<string, string> = { manual: '✏️', ocr: '📷', whatsapp: '💬', email: '📧' }

type TipoRecurrencia = 'suscripcion' | 'fijo' | null

type Gasto = {
  id: string
  fecha: string
  monto: number
  nota?: string
  fuente: string
  cuota_actual?: number
  cuotas_total?: number
  fecha_vencimiento?: string
  tipo_recurrencia?: TipoRecurrencia
  personas?: { nombre: string; color: string }
  conceptos?: { nombre: string }
}

const RECURRENCIA_BADGE: Record<string, { label: string; cls: string }> = {
  suscripcion: { label: '🔄 Suscripción', cls: 'bg-purple-50 text-purple-600 border-purple-100' },
  fijo:        { label: '📌 Fijo',         cls: 'bg-amber-50  text-amber-600  border-amber-100'  },
}

const mesActual = new Date().getMonth() + 1

export default function GastosPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [conceptos, setConceptos] = useState<Concepto[]>([])

  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [persona, setPersona] = useState('')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [nota, setNota] = useState('')
  const [tipoRecurrencia, setTipoRecurrencia] = useState<TipoRecurrencia>(null)

  const [mesSeleccionado, setMesSeleccionado] = useState(mesActual)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroPersona, setFiltroPersona] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [gastoEditando, setGastoEditando] = useState<Gasto | null>(null)
  const [editMonto, setEditMonto] = useState('')
  const [editPersona, setEditPersona] = useState('')
  const [editConcepto, setEditConcepto] = useState('')
  const [editFecha, setEditFecha] = useState('')
  const [editNota, setEditNota] = useState('')
  const [editCuotaActual, setEditCuotaActual] = useState('')
  const [editCuotasTotal, setEditCuotasTotal] = useState('')
  const [editFechaVenc, setEditFechaVenc] = useState('')
  const [editTipoRecurrencia, setEditTipoRecurrencia] = useState<TipoRecurrencia>(null)
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  const [conceptosEdit, setConceptosEdit] = useState<Concepto[]>([])

  // Cargar personas al montar
  useEffect(() => {
    fetch('/api/personas').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPersonas(data)
    })
  }, [])

  // Cargar conceptos cuando cambia persona en el formulario nuevo
  useEffect(() => {
    if (!persona) { setConceptos([]); setConcepto(''); return }
    const p = personas.find(x => x.nombre === persona)
    if (!p) return
    fetch(`/api/conceptos?persona_id=${p.id}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setConceptos(data)
    })
    setConcepto('')
  }, [persona, personas])

  // Cargar conceptos cuando cambia persona en el modal de edición
  useEffect(() => {
    if (!editPersona) { setConceptosEdit([]); return }
    const p = personas.find(x => x.nombre === editPersona)
    if (!p) return
    fetch(`/api/conceptos?persona_id=${p.id}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setConceptosEdit(data)
    })
  }, [editPersona, personas])

  const cargarGastos = useCallback(async () => {
    setCargando(true)
    const res = await fetch(`/api/gastos?mes=${mesSeleccionado}`)
    const data = await res.json()
    setGastos(Array.isArray(data) ? data : [])
    setCargando(false)
  }, [mesSeleccionado])

  useEffect(() => { cargarGastos() }, [cargarGastos])

  async function guardar() {
    const montoNum = parseInt(monto)
    if (!montoNum || montoNum <= 0 || !persona || !concepto) return
    setGuardando(true)
    const res = await fetch('/api/gastos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, persona_nombre: persona, concepto_nombre: concepto, monto: montoNum, nota, fuente: 'manual', tipo_recurrencia: tipoRecurrencia }),
    })
    setGuardando(false)
    if (res.ok) {
      setGuardado(true)
      setTimeout(() => { setGuardado(false); setShowForm(false); setMonto(''); setNota(''); setPersona(''); setConcepto(''); setTipoRecurrencia(null) }, 1500)
      cargarGastos()
    }
  }

  function abrirEdicion(g: Gasto) {
    setGastoEditando(g)
    setEditMonto(String(g.monto))
    setEditPersona(g.personas?.nombre ?? '')
    setEditConcepto(g.conceptos?.nombre ?? '')
    setEditFecha(g.fecha)
    setEditNota(g.nota ?? '')
    setEditCuotaActual(g.cuota_actual ? String(g.cuota_actual) : '')
    setEditCuotasTotal(g.cuotas_total ? String(g.cuotas_total) : '')
    setEditFechaVenc(g.fecha_vencimiento ?? '')
    setEditTipoRecurrencia(g.tipo_recurrencia ?? null)
  }

  async function guardarEdicion() {
    if (!gastoEditando) return
    const montoNum = parseInt(editMonto)
    if (!montoNum || montoNum <= 0) return
    setGuardandoEdit(true)

    // Primero actualizar datos principales si cambiaron
    const cambiosPrincipales = editMonto !== String(gastoEditando.monto)
      || editPersona !== gastoEditando.personas?.nombre
      || editConcepto !== gastoEditando.conceptos?.nombre
      || editFecha !== gastoEditando.fecha
      || editNota !== (gastoEditando.nota ?? '')

    if (cambiosPrincipales) {
      await fetch(`/api/gastos/${gastoEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_nombre: editPersona,
          concepto_nombre: editConcepto,
          monto: montoNum,
          fecha: editFecha,
          nota: editNota,
        }),
      })
    }

    // Actualizar cuota/vencimiento
    await fetch(`/api/gastos/${gastoEditando.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cuota_actual: editCuotaActual ? parseInt(editCuotaActual) : null,
        cuotas_total: editCuotasTotal ? parseInt(editCuotasTotal) : null,
        fecha_vencimiento: editFechaVenc || null,
        tipo_recurrencia: editTipoRecurrencia,
      }),
    })

    setGuardandoEdit(false)
    setGastoEditando(null)
    cargarGastos()
  }

  async function eliminarGasto() {
    if (!gastoEditando) return
    if (!confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.')) return
    setEliminando(true)
    await fetch(`/api/gastos/${gastoEditando.id}`, { method: 'DELETE' })
    setEliminando(false)
    setGastoEditando(null)
    cargarGastos()
  }

  function exportarCSV() {
    const gastosFiltrados = gastosFiltradosCalc()
    const cabecera = 'Fecha,Persona,Categoría,Monto,Nota,Fuente'
    const filas = gastosFiltrados.map(g =>
      [
        g.fecha,
        g.personas?.nombre ?? '',
        g.conceptos?.nombre ?? '',
        g.monto,
        `"${(g.nota ?? '').replace(/"/g, '""')}"`,
        g.fuente,
      ].join(',')
    )
    const csv = [cabecera, ...filas].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gastos-${MESES[mesSeleccionado - 1].toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function gastosFiltradosCalc() {
    return gastos.filter(g => {
      const matchPersona = !filtroPersona || g.personas?.nombre === filtroPersona
      const q = busqueda.toLowerCase()
      const matchBusqueda = !q
        || (g.conceptos?.nombre ?? '').toLowerCase().includes(q)
        || (g.nota ?? '').toLowerCase().includes(q)
        || (g.personas?.nombre ?? '').toLowerCase().includes(q)
      return matchPersona && matchBusqueda
    })
  }

  const gastosFiltrados = gastosFiltradosCalc()
  const totalMes = gastos.reduce((s, g) => s + g.monto, 0)
  const totalFiltrado = gastosFiltrados.reduce((s, g) => s + g.monto, 0)
  const hayFiltro = !!filtroPersona || !!busqueda

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
                  onChange={e => setPersona(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Seleccioná</option>
                  {personas.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <input
                  list="conceptos-list"
                  value={concepto}
                  onChange={e => setConcepto(e.target.value)}
                  placeholder={persona ? 'Seleccioná o escribí nueva' : 'Primero elegí persona'}
                  disabled={!persona}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-40"
                />
                <datalist id="conceptos-list">
                  {conceptos.map(c => <option key={c.id} value={c.nombre}/>)}
                </datalist>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de gasto</label>
              <div className="flex gap-2">
                {([null, 'suscripcion', 'fijo'] as TipoRecurrencia[]).map(t => (
                  <button
                    key={String(t)}
                    type="button"
                    onClick={() => setTipoRecurrencia(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      tipoRecurrencia === t
                        ? t === 'suscripcion' ? 'bg-purple-600 text-white border-purple-600'
                          : t === 'fijo' ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-gray-700 text-white border-gray-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {t === null ? 'Normal' : t === 'suscripcion' ? '🔄 Suscripción' : '📌 Fijo mensual'}
                  </button>
                ))}
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
                disabled={!monto || parseInt(monto) <= 0 || !persona || !concepto || guardando}
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
        <div className="px-4 py-3 border-b border-gray-100 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-700">Gastos del mes</h3>
              {!cargando && gastos.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {hayFiltro
                    ? `${gastosFiltrados.length} de ${gastos.length} · ${formatGsCompleto(totalFiltrado)}`
                    : `Total: ${formatGsCompleto(totalMes)}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {gastos.length > 0 && (
                <button
                  onClick={exportarCSV}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5"
                  title="Exportar CSV"
                >
                  <Download size={13}/> CSV
                </button>
              )}
              <select
                value={mesSeleccionado}
                onChange={e => setMesSeleccionado(parseInt(e.target.value))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none"
              >
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por categoría, nota o persona..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          {/* Filtro por persona — chips */}
          {personas.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFiltroPersona('')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  !filtroPersona ? 'bg-[#2C3E50] text-white border-[#2C3E50]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Todos
              </button>
              {personas.map(p => (
                <button
                  key={p.id}
                  onClick={() => setFiltroPersona(filtroPersona === p.nombre ? '' : p.nombre)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filtroPersona === p.nombre ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={filtroPersona === p.nombre ? { backgroundColor: p.color, borderColor: p.color } : {}}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 className="animate-spin" size={18}/> Cargando...
          </div>
        ) : gastosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            {hayFiltro ? 'Sin resultados para este filtro' : `Sin gastos para ${MESES[mesSeleccionado - 1]}`}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {gastosFiltrados.map(g => (
              <div
                key={g.id}
                className="px-4 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => abrirEdicion(g)}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{g.conceptos?.nombre ?? '—'}</span>
                    {g.tipo_recurrencia && RECURRENCIA_BADGE[g.tipo_recurrencia] && (
                      <span className={`text-xs border px-1.5 py-0.5 rounded font-medium ${RECURRENCIA_BADGE[g.tipo_recurrencia].cls}`}>
                        {RECURRENCIA_BADGE[g.tipo_recurrencia].label}
                      </span>
                    )}
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

      {/* Modal de edición completo */}
      {gastoEditando && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-gray-800 text-lg">Editar gasto</h3>
                <button onClick={() => setGastoEditando(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20}/>
                </button>
              </div>

              {/* Datos principales */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Monto (₲)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editMonto}
                    onChange={e => setEditMonto(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Persona</label>
                    <select value={editPersona} onChange={e => { setEditPersona(e.target.value); setEditConcepto('') }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="">Seleccioná</option>
                      {personas.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                    <input
                      list="conceptos-edit-list"
                      value={editConcepto}
                      onChange={e => setEditConcepto(e.target.value)}
                      placeholder="Seleccioná o escribí"
                      disabled={!editPersona}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-40"
                    />
                    <datalist id="conceptos-edit-list">
                      {conceptosEdit.map(c => <option key={c.id} value={c.nombre}/>)}
                    </datalist>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
                    <input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nota</label>
                    <input type="text" value={editNota} onChange={e => setEditNota(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                  </div>
                </div>
              </div>

              {/* Tipo de recurrencia */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><Repeat2 size={12}/> Tipo de gasto</label>
                <div className="flex gap-1.5">
                  {([null, 'suscripcion', 'fijo'] as TipoRecurrencia[]).map(t => (
                    <button
                      key={String(t)}
                      type="button"
                      onClick={() => setEditTipoRecurrencia(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        editTipoRecurrencia === t
                          ? t === 'suscripcion' ? 'bg-purple-600 text-white border-purple-600'
                            : t === 'fijo' ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-gray-700 text-white border-gray-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {t === null ? 'Normal' : t === 'suscripcion' ? '🔄 Suscripción' : '📌 Fijo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuota y vencimiento */}
              <div className="bg-blue-50 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs">
                  <CreditCard size={14}/> Cuota y vencimiento (opcional)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cuota actual</label>
                    <input type="number" min="1" value={editCuotaActual} onChange={e => setEditCuotaActual(e.target.value)}
                      placeholder="ej: 25"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Total cuotas</label>
                    <input type="number" min="1" value={editCuotasTotal} onChange={e => setEditCuotasTotal(e.target.value)}
                      placeholder="ej: 60"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha de vencimiento</label>
                  <input type="date" value={editFechaVenc} onChange={e => setEditFechaVenc(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={guardarEdicion}
                disabled={guardandoEdit || !editMonto || parseInt(editMonto) <= 0}
                className="flex-1 bg-[#2C3E50] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#34495E] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {guardandoEdit ? <Loader2 size={15} className="animate-spin"/> : null}
                Guardar
              </button>
              <button
                onClick={eliminarGasto}
                disabled={eliminando}
                className="flex items-center gap-1.5 px-4 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
              >
                {eliminando ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
