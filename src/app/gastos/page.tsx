'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle, Loader2, X, CreditCard, Trash2, Download, Search, Repeat2, XCircle } from 'lucide-react'
import { MESES, formatGsCompleto } from '@/lib/supabase'

type Persona = { id: string; nombre: string; color: string }
type Categoria = { id: string; nombre: string; icono: string; color: string }

const FUENTE_LABEL: Record<string, string> = { manual: '✏️', ocr: '📷', whatsapp: '💬', email: '📧' }

type TipoRecurrencia = 'suscripcion' | 'fijo' | null

type TarjetaSimple = { id: string; nombre: string; banco: string; personas?: { nombre: string } | null }

type Gasto = {
  id: string
  fecha: string
  monto: number
  descripcion?: string
  nota?: string
  fuente: string
  cuota_actual?: number
  cuotas_total?: number
  cuota_num?: number
  compra_origen_id?: string
  es_cuota?: boolean
  excluir_resumen?: boolean
  fecha_vencimiento?: string
  tipo_recurrencia?: TipoRecurrencia
  suscripcion_id?: string
  tarjeta_id?: string
  personas?: { nombre: string; color: string }
  categorias?: { nombre: string; color: string; icono: string }
  tarjetas?: TarjetaSimple
}

const RECURRENCIA_BADGE: Record<string, { label: string; cls: string }> = {
  suscripcion: { label: '🔄 Suscripción', cls: 'bg-purple-50 text-purple-600 border-purple-100' },
  fijo:        { label: '📌 Fijo',         cls: 'bg-amber-50  text-amber-600  border-amber-100'  },
}

const mesActual = new Date().getMonth() + 1
const anioActual = new Date().getFullYear()

export default function GastosPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [tarjetas, setTarjetas] = useState<TarjetaSimple[]>([])

  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [persona, setPersona] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [tarjetaId, setTarjetaId] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [nota, setNota] = useState('')
  const [tipoRecurrencia, setTipoRecurrencia] = useState<TipoRecurrencia>(null)
  const [cuotasTotal, setCuotasTotal] = useState('1')
  const [fechaVenc, setFechaVenc] = useState('')

  const [mesSeleccionado, setMesSeleccionado] = useState(mesActual)
  const [anioSeleccionado, setAnioSeleccionado] = useState(anioActual)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroPersona, setFiltroPersona] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [gastoEditando, setGastoEditando] = useState<Gasto | null>(null)
  const [editMonto, setEditMonto] = useState('')
  const [editPersona, setEditPersona] = useState('')
  const [editDescripcion, setEditDescripcion] = useState('')
  const [editCategoriaId, setEditCategoriaId] = useState('')
  const [editTarjetaId, setEditTarjetaId] = useState('')
  const [editFecha, setEditFecha] = useState('')
  const [editNota, setEditNota] = useState('')
  const [editCuotaActual, setEditCuotaActual] = useState('')
  const [editCuotasTotal, setEditCuotasTotal] = useState('')
  const [editFechaVenc, setEditFechaVenc] = useState('')
  const [editTipoRecurrencia, setEditTipoRecurrencia] = useState<TipoRecurrencia>(null)
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [cancelandoSuscripcion, setCancelandoSuscripcion] = useState(false)

  useEffect(() => {
    fetch('/api/personas').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPersonas(data)
    })
    fetch('/api/categorias').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCategorias(data)
    })
    fetch('/api/tarjetas').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setTarjetas(data)
    })
  }, [])

  const cargarGastos = useCallback(async () => {
    setCargando(true)
    const res = await fetch(`/api/gastos?mes=${mesSeleccionado}&anio=${anioSeleccionado}`)
    const data = await res.json()
    setGastos(Array.isArray(data) ? data : [])
    setCargando(false)
  }, [mesSeleccionado, anioSeleccionado])

  useEffect(() => { cargarGastos() }, [cargarGastos])

  function resetForm() {
    setMonto(''); setNota(''); setPersona('')
    setDescripcion(''); setCategoriaId(''); setTarjetaId(''); setTipoRecurrencia(null)
    setCuotasTotal('1'); setFechaVenc('')
  }

  async function guardar() {
    const montoNum = parseInt(monto)
    const esPagoTarjetaLocal = categorias.find(c => c.id === categoriaId)?.nombre === 'Pago Tarjeta'
    if (!montoNum || montoNum <= 0 || !persona || !descripcion || !categoriaId) return
    if (esPagoTarjetaLocal && !tarjetaId) return
    setGuardando(true)
    const res = await fetch('/api/gastos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha, persona_nombre: persona, descripcion, categoria_id: categoriaId, tarjeta_id: tarjetaId || null,
        monto: montoNum, nota, fuente: 'manual', tipo_recurrencia: tipoRecurrencia,
        cuotas_total: cuotasTotal && parseInt(cuotasTotal) > 1 ? cuotasTotal : null,
        fecha_vencimiento: fechaVenc || null,
        es_pago_tarjeta: esPagoTarjetaLocal,
      }),
    })
    setGuardando(false)
    if (res.ok) {
      setGuardado(true)
      setTimeout(() => { setGuardado(false); setShowForm(false); resetForm() }, 1500)
      cargarGastos()
    }
  }

  function abrirEdicion(g: Gasto) {
    setGastoEditando(g)
    setEditMonto(String(g.monto))
    setEditPersona(g.personas?.nombre ?? '')
    setEditDescripcion(g.descripcion ?? '')
    setEditCategoriaId(g.categorias ? categorias.find(c => c.nombre === g.categorias!.nombre)?.id ?? '' : '')
    setEditTarjetaId(g.tarjeta_id ?? '')
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

    const cambiosPrincipales =
      editMonto !== String(gastoEditando.monto)
      || editPersona !== gastoEditando.personas?.nombre
      || editDescripcion !== (gastoEditando.descripcion ?? '')
      || editCategoriaId !== (gastoEditando.categorias ? categorias.find(c => c.nombre === gastoEditando.categorias!.nombre)?.id ?? '' : '')
      || editFecha !== gastoEditando.fecha
      || editNota !== (gastoEditando.nota ?? '')

    if (cambiosPrincipales || editTarjetaId !== (gastoEditando.tarjeta_id ?? '')) {
      await fetch(`/api/gastos/${gastoEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_nombre: editPersona,
          descripcion: editDescripcion,
          categoria_id: editCategoriaId,
          tarjeta_id: editTarjetaId || null,
          monto: montoNum,
          fecha: editFecha,
          nota: editNota,
        }),
      })
    }

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

  async function cancelarSuscripcion() {
    if (!gastoEditando) return
    const label = gastoEditando.tipo_recurrencia === 'fijo' ? 'gasto fijo' : 'suscripción'
    if (!confirm(`¿Cancelar esta ${label}? Los meses siguientes al actual se eliminarán.`)) return
    setCancelandoSuscripcion(true)
    await fetch(`/api/gastos/${gastoEditando.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancelar_suscripcion' }),
    })
    setCancelandoSuscripcion(false)
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
    const filtrados = gastosFiltradosCalc()
    const cabecera = 'Fecha,Persona,Descripción,Categoría,Monto,Nota,Fuente'
    const filas = filtrados.map(g =>
      [
        g.fecha,
        g.personas?.nombre ?? '',
        `"${(g.descripcion ?? '').replace(/"/g, '""')}"`,
        g.categorias?.nombre ?? '',
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
    a.download = `gastos-${MESES[mesSeleccionado - 1].toLowerCase()}-${anioSeleccionado}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function gastosFiltradosCalc() {
    return gastos.filter(g => {
      const matchPersona = !filtroPersona || g.personas?.nombre === filtroPersona
      const matchCategoria = !filtroCategoria || g.categorias?.nombre === filtroCategoria
      const q = busqueda.toLowerCase()
      const matchBusqueda = !q
        || (g.descripcion ?? '').toLowerCase().includes(q)
        || (g.nota ?? '').toLowerCase().includes(q)
        || (g.personas?.nombre ?? '').toLowerCase().includes(q)
        || (g.categorias?.nombre ?? '').toLowerCase().includes(q)
      return matchPersona && matchCategoria && matchBusqueda
    })
  }

  const gastosFiltrados = gastosFiltradosCalc()
  const totalMes = gastos.filter(g => !g.excluir_resumen).reduce((s, g) => s + g.monto, 0)
  const totalFiltrado = gastosFiltrados.filter(g => !g.excluir_resumen).reduce((s, g) => s + g.monto, 0)
  const hayFiltro = !!filtroPersona || !!filtroCategoria || !!busqueda

  const categoriaSeleccionada = categorias.find(c => c.id === categoriaId)
  const editCategoriaSeleccionada = categorias.find(c => c.id === editCategoriaId)
  const esPagoTarjeta = categoriaSeleccionada?.nombre === 'Pago Tarjeta'

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
                type="number" inputMode="numeric" value={monto}
                onChange={e => setMonto(e.target.value)} placeholder="ej: 150000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
                <select value={persona} onChange={e => setPersona(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">Seleccioná</option>
                  {personas.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  placeholder="Netflix, Supermercado..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {categorias.map(c => (
                  <button
                    key={c.id} type="button" onClick={() => setCategoriaId(c.id)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-medium border transition-colors ${
                      categoriaId === c.id ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                    }`}
                    style={categoriaId === c.id ? { backgroundColor: c.color, borderColor: c.color } : {}}
                  >
                    <span className="text-lg">{c.icono}</span>
                    {c.nombre}
                  </button>
                ))}
              </div>
            </div>

            {esPagoTarjeta && (
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700">
                <span className="text-base">💳</span>
                <span>Este pago <strong>descontará la deuda</strong> de la tarjeta seleccionada.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarjeta de Crédito {esPagoTarjeta ? <span className="text-rose-500">*</span> : <span className="text-gray-400">(opcional)</span>}
                </label>
                <select value={tarjetaId} onChange={e => setTarjetaId(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 ${
                    esPagoTarjeta && !tarjetaId ? 'border-rose-300 focus:ring-rose-300' : 'border-gray-200 focus:ring-blue-300'
                  }`}>
                  <option value="">{esPagoTarjeta ? 'Seleccioná la tarjeta' : 'Ninguna / Efectivo'}</option>
                  {tarjetas.map(t => <option key={t.id} value={t.id}>{t.banco} - {t.nombre}{t.personas?.nombre ? ` (${t.personas.nombre})` : ''}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de gasto</label>
              <div className="flex gap-2">
                {([null, 'suscripcion', 'fijo'] as TipoRecurrencia[]).map(t => (
                  <button key={String(t)} type="button" onClick={() => setTipoRecurrencia(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      tipoRecurrencia === t
                        ? t === 'suscripcion' ? 'bg-purple-600 text-white border-purple-600'
                          : t === 'fijo' ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-gray-700 text-white border-gray-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {t === null ? 'Normal' : t === 'suscripcion' ? '🔄 Suscripción' : '📌 Fijo mensual'}
                  </button>
                ))}
              </div>
            </div>

            {(tarjetaId || categoriaSeleccionada?.nombre === 'Deudas') && !esPagoTarjeta && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cuotas</label>
                    <input type="number" inputMode="numeric" min="1" max="60" value={cuotasTotal}
                      onChange={e => setCuotasTotal(e.target.value)} placeholder="1"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                  </div>
                  {monto && parseInt(cuotasTotal) > 1 && (
                    <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-sm text-blue-700">
                      <span className="text-xs text-blue-500 block">Por mes</span>
                      <span className="font-bold">{formatGsCompleto(Math.round(parseInt(monto) / parseInt(cuotasTotal)))}</span>
                    </div>
                  )}
                </div>
                {parseInt(cuotasTotal) > 1 && (
                  <p className="text-xs text-gray-400">
                    La 1ª cuota se descuenta en {(() => {
                      const d = new Date(fecha + 'T12:00:00')
                      d.setMonth(d.getMonth() + 1)
                      return d.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })
                    })()}
                  </p>
                )}
              </div>
            )}
          </div>

          {guardado ? (
            <div className="flex items-center gap-2 text-emerald-600 font-semibold py-1">
              <CheckCircle size={18}/> ¡Guardado!
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={guardar}
                disabled={!monto || parseInt(monto) <= 0 || !persona || !descripcion || !categoriaId || (esPagoTarjeta && !tarjetaId) || guardando}
                className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-emerald-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95"
              >
                {guardando && <Loader2 size={18} className="animate-spin"/>}
                {categoriaSeleccionada && <span>{categoriaSeleccionada.icono}</span>}
                Guardar
              </button>
              <button onClick={() => { setShowForm(false); resetForm() }}
                className="px-5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-base">
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
                <button onClick={exportarCSV}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5"
                  title="Exportar CSV">
                  <Download size={13}/> CSV
                </button>
              )}
              <select value={mesSeleccionado} onChange={e => setMesSeleccionado(parseInt(e.target.value))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select value={anioSeleccionado} onChange={e => setAnioSeleccionado(parseInt(e.target.value))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
                {[anioActual, anioActual - 1, anioActual - 2].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por descripción, categoría, nota o persona..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"/>
          </div>

          {/* Filtro por persona */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFiltroPersona('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                !filtroPersona ? 'bg-[#2C3E50] text-white border-[#2C3E50]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}>
              Todos
            </button>
            {personas.map(p => (
              <button key={p.id} onClick={() => setFiltroPersona(filtroPersona === p.nombre ? '' : p.nombre)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filtroPersona === p.nombre ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={filtroPersona === p.nombre ? { backgroundColor: p.color, borderColor: p.color } : {}}>
                {p.nombre}
              </button>
            ))}
          </div>

          {/* Filtro por categoría */}
          {categorias.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setFiltroCategoria('')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  !filtroCategoria ? 'bg-gray-700 text-white border-gray-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                Todas
              </button>
              {categorias.map(c => (
                <button key={c.id} onClick={() => setFiltroCategoria(filtroCategoria === c.nombre ? '' : c.nombre)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filtroCategoria === c.nombre ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={filtroCategoria === c.nombre ? { backgroundColor: c.color, borderColor: c.color } : {}}>
                  {c.icono} {c.nombre}
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
            {hayFiltro ? 'Sin resultados para este filtro' : `Sin gastos para ${MESES[mesSeleccionado - 1]} ${anioSeleccionado}`}
          </div>
        ) : (
          <GastosList gastos={gastosFiltrados} onEdit={abrirEdicion} />
        )}
      </div>

      {/* Modal de edición */}
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

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Monto (₲)</label>
                  <input type="number" inputMode="numeric" value={editMonto} onChange={e => setEditMonto(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Persona</label>
                    <select value={editPersona} onChange={e => setEditPersona(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="">Seleccioná</option>
                      {personas.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                    <input type="text" value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)}
                      placeholder="Netflix, Farmacia..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {categorias.map(c => (
                      <button key={c.id} type="button" onClick={() => setEditCategoriaId(c.id)}
                        className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs font-medium border transition-colors ${
                          editCategoriaId === c.id ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                        }`}
                        style={editCategoriaId === c.id ? { backgroundColor: c.color, borderColor: c.color } : {}}>
                        <span>{c.icono}</span>
                        <span className="leading-tight text-center" style={{ fontSize: '10px' }}>{c.nombre}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
                    <input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tarjeta de Crédito</label>
                    <select value={editTarjetaId} onChange={e => setEditTarjetaId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                      <option value="">Ninguna / Efectivo</option>
                      {tarjetas.map(t => <option key={t.id} value={t.id}>{t.banco} - {t.nombre}{t.personas?.nombre ? ` (${t.personas.nombre})` : ''}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><Repeat2 size={12}/> Tipo de gasto</label>
                <div className="flex gap-1.5">
                  {([null, 'suscripcion', 'fijo'] as TipoRecurrencia[]).map(t => (
                    <button key={String(t)} type="button" onClick={() => setEditTipoRecurrencia(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        editTipoRecurrencia === t
                          ? t === 'suscripcion' ? 'bg-purple-600 text-white border-purple-600'
                            : t === 'fijo' ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-gray-700 text-white border-gray-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {t === null ? 'Normal' : t === 'suscripcion' ? '🔄 Suscripción' : '📌 Fijo'}
                    </button>
                  ))}
                </div>
              </div>

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

            {gastoEditando.suscripcion_id && (
              <div className="px-5 pb-3">
                <button onClick={cancelarSuscripcion} disabled={cancelandoSuscripcion}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-40">
                  {cancelandoSuscripcion ? <Loader2 size={14} className="animate-spin"/> : <XCircle size={14}/>}
                  {gastoEditando.tipo_recurrencia === 'fijo' ? 'Cancelar gasto fijo' : 'Cancelar suscripción'}
                </button>
              </div>
            )}

            <div className="px-5 pb-5 flex gap-2">
              <button onClick={guardarEdicion}
                disabled={guardandoEdit || !editMonto || parseInt(editMonto) <= 0}
                className="flex-1 bg-[#2C3E50] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#34495E] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {guardandoEdit ? <Loader2 size={15} className="animate-spin"/> : null}
                {editCategoriaSeleccionada && <span>{editCategoriaSeleccionada.icono}</span>}
                Guardar
              </button>
              <button onClick={eliminarGasto} disabled={eliminando}
                className="flex items-center gap-1.5 px-4 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
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

// ── Lista de gastos agrupada por día ──────────────────────────────────────────
function GastosList({ gastos, onEdit }: { gastos: Gasto[]; onEdit: (g: Gasto) => void }) {
  // Agrupar por fecha
  const grupos = gastos.reduce<Record<string, Gasto[]>>((acc, g) => {
    const key = g.fecha.split('T')[0]
    ;(acc[key] ??= []).push(g)
    return acc
  }, {})

  const fechasOrdenadas = Object.keys(grupos).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      {fechasOrdenadas.map(fecha => {
        const items = grupos[fecha]
        const totalDia = items.filter(g => !g.excluir_resumen).reduce((s, g) => s + g.monto, 0)
        const d = new Date(fecha + 'T12:00:00')
        const label = d.toLocaleDateString('es-PY', { weekday: 'short', day: 'numeric', month: 'short' })

        return (
          <div key={fecha}>
            {/* Cabecera de día */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <span className="text-xs font-semibold text-gray-500 capitalize">{label}</span>
              <span className="text-xs font-medium text-gray-400">{formatGsCompleto(totalDia)}</span>
            </div>

            {/* Filas compactas */}
            {items.map(g => (
              <div key={g.id}
                className="px-4 py-2 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                onClick={() => onEdit(g)}>

                {/* Icono categoría */}
                <span className="text-base shrink-0 w-6 text-center">
                  {g.categorias?.icono ?? '💸'}
                </span>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm font-medium truncate ${g.descripcion ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                      {g.descripcion || g.nota || '—'}
                    </span>
                    {g.tarjetas?.nombre && (
                      <span className="text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium shrink-0">
                        {g.tarjetas.banco}
                      </span>
                    )}
                    {g.es_cuota && g.cuota_num && g.cuotas_total && (
                      <span className="text-[11px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-medium shrink-0">
                        {g.cuota_num}/{g.cuotas_total}
                      </span>
                    )}
                    {g.tipo_recurrencia === 'suscripcion' && (
                      <span className="text-[11px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded font-medium shrink-0">🔄</span>
                    )}
                    {g.tipo_recurrencia === 'fijo' && (
                      <span className="text-[11px] bg-amber-50 text-amber-500 px-1.5 py-0.5 rounded font-medium shrink-0">📌</span>
                    )}
                    {g.excluir_resumen && !g.es_cuota && g.cuotas_total && (
                      <span className="text-[11px] text-gray-400 shrink-0">💳×{g.cuotas_total}</span>
                    )}
                    <span className="text-[11px] text-gray-300 shrink-0">{FUENTE_LABEL[g.fuente] ?? ''}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    <span style={{ color: g.personas?.color }}>{g.personas?.nombre}</span>
                    {g.categorias?.nombre && (
                      <span style={{ color: g.categorias.color }}> · {g.categorias.nombre}</span>
                    )}
                    {g.nota && g.nota !== g.descripcion && ` · ${g.nota}`}
                  </p>
                </div>

                {/* Monto */}
                <span className={`text-sm font-bold shrink-0 ${g.excluir_resumen ? 'text-gray-300 line-through' : 'text-gray-800'}`}>
                  {formatGsCompleto(g.monto)}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
