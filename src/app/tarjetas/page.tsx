'use client'

import { useState, useEffect, useCallback } from 'react'
import { CreditCard, Plus, Edit2, Trash2, Loader2, X } from 'lucide-react'
import { Tarjeta, Persona, formatGsCompleto } from '@/lib/supabase'

type GastoSub = {
  id: string
  descripcion?: string
  monto: number
  fecha: string
  tipo_recurrencia?: string
  tarjeta_id?: string
  personas?: { nombre: string; color: string }
  categorias?: { nombre: string; color: string; icono: string }
}

export default function TarjetasPage() {
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [gastosMes, setGastosMes] = useState<GastoSub[]>([])
  const [cargando, setCargando] = useState(true)

  // Formulario de tarjeta
  const [showModal, setShowModal] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [banco, setBanco] = useState('')
  const [personaId, setPersonaId] = useState('')
  const [limite, setLimite] = useState('')
  const [deudaActual, setDeudaActual] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    const mesActual = new Date().getMonth() + 1
    const [resTarjetas, resPersonas, resGastos] = await Promise.all([
      fetch('/api/tarjetas').then(r => r.json()),
      fetch('/api/personas').then(r => r.json()),
      fetch(`/api/gastos?mes=${mesActual}`).then(r => r.json())
    ])

    if (Array.isArray(resTarjetas)) setTarjetas(resTarjetas)
    if (Array.isArray(resPersonas)) setPersonas(resPersonas)
    if (Array.isArray(resGastos)) setGastosMes(resGastos)
    setCargando(false)
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  function abrirModalNueva() {
    setEditandoId(null)
    setNombre('')
    setBanco('')
    setPersonaId(personas[0]?.id ?? '')
    setLimite('')
    setDeudaActual('')
    setShowModal(true)
  }

  function abrirModalEdicion(t: Tarjeta) {
    setEditandoId(t.id)
    setNombre(t.nombre)
    setBanco(t.banco)
    setPersonaId(t.persona_id ?? '')
    setLimite(String(t.limite ?? 0))
    setDeudaActual(String(t.deuda_actual ?? 0))
    setShowModal(true)
  }

  async function guardarTarjeta() {
    if (!nombre.trim() || !banco.trim()) return
    setGuardando(true)
    const payload = {
      nombre: nombre.trim(),
      banco: banco.trim(),
      persona_id: personaId || null,
      limite: parseInt(limite) || 0,
      deuda_actual: parseInt(deudaActual) || 0
    }

    const url = editandoId ? `/api/tarjetas/${editandoId}` : '/api/tarjetas'
    const method = editandoId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    setGuardando(false)
    if (res.ok) {
      setShowModal(false)
      cargarDatos()
    }
  }

  async function eliminarTarjeta(id: string) {
    if (!confirm('¿Desactivar esta tarjeta?')) return
    await fetch(`/api/tarjetas/${id}`, { method: 'DELETE' })
    cargarDatos()
  }

  // Cálculos por tarjeta
  const totalDeudasCards = tarjetas.reduce((acc, t) => acc + (t.deuda_actual || 0), 0)
  const totalLimitesCards = tarjetas.reduce((acc, t) => acc + (t.limite || 0), 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="text-blue-600" size={28} /> Tarjetas de Crédito
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de tarjetas, límites de crédito, saldos de deuda y cobros de suscripciones/gastos.
          </p>
        </div>
        <button
          onClick={abrirModalNueva}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl transition-colors shadow-sm text-sm"
        >
          <Plus size={18} /> Nueva tarjeta
        </button>
      </div>

      {/* Tarjetas resumen superior */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Crédito Disponible Total</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatGsCompleto(Math.max(0, totalLimitesCards - totalDeudasCards))}</p>
          <p className="text-xs text-gray-400 mt-1">Límite menos deudas de todas las tarjetas</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Deuda Acumulada</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatGsCompleto(totalDeudasCards)}</p>
          <p className="text-xs text-gray-400 mt-1">Suma de saldos deudores de todas las tarjetas</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Límite Total de Crédito</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{formatGsCompleto(totalLimitesCards)}</p>
          <p className="text-xs text-gray-400 mt-1">Cupo total otorgado por bancos</p>
        </div>
      </div>

      {/* Grid de Tarjetas */}
      {cargando ? (
        <div className="flex justify-center items-center py-16 text-gray-400 gap-2">
          <Loader2 className="animate-spin" size={20} /> Cargando tarjetas...
        </div>
      ) : tarjetas.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm space-y-3">
          <CreditCard className="mx-auto text-gray-300" size={48} />
          <h3 className="text-lg font-semibold text-gray-700">No hay tarjetas registradas</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Registrá tus tarjetas de crédito para asignarles suscripciones (Netflix, Spotify), combustible u otros gastos.
          </p>
          <button
            onClick={abrirModalNueva}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={16} /> Crear primera tarjeta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tarjetas.map(t => {
            const gastosConTarjeta = gastosMes.filter(g => g.tarjeta_id === t.id)
            const montoMesActual = gastosConTarjeta.reduce((sum, g) => sum + g.monto, 0)
            const suscripcionesConTarjeta = gastosConTarjeta.filter(g => g.tipo_recurrencia === 'suscripcion' || g.tipo_recurrencia === 'fijo')
            const disponible = (t.limite ?? 0) - (t.deuda_actual ?? 0)

            return (
              <div key={t.id} className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between space-y-6">
                {/* Visual card header */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs uppercase font-bold tracking-widest text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-800/40">
                      {t.banco}
                    </span>
                    <div className="flex items-center gap-1 bg-slate-950/50 rounded-lg p-1">
                      <button
                        onClick={() => abrirModalEdicion(t)}
                        className="p-1.5 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => eliminarTarjeta(t.id)}
                        className="p-1.5 hover:bg-red-900/60 rounded-md text-slate-300 hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold tracking-wide">{t.nombre}</h3>

                  {t.personas && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      Titular: <span className="font-semibold text-slate-200">{t.personas.nombre}</span>
                    </p>
                  )}
                </div>

                {/* Card metrics */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Disponible</span>
                    <span className="text-base font-bold text-emerald-400">{formatGsCompleto(disponible)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Deuda Actual</span>
                    <span className="text-base font-bold text-amber-400">{formatGsCompleto(t.deuda_actual ?? 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Límite Crédito</span>
                    <span className="text-base font-semibold text-slate-200">{formatGsCompleto(t.limite ?? 0)}</span>
                  </div>
                </div>

                {/* Gastos y Suscripciones vinculadas este mes */}
                <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Cargos de este mes:</span>
                    <span className="font-bold text-emerald-400 text-sm">{formatGsCompleto(montoMesActual)}</span>
                  </div>

                  {suscripcionesConTarjeta.length > 0 ? (
                    <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-400 block font-medium">Suscripciones en esta tarjeta:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {suscripcionesConTarjeta.map(s => (
                          <span key={s.id} className="text-[11px] bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-800/50">
                            {s.descripcion} ({formatGsCompleto(s.monto)})
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">Sin suscripciones o gastos vinculados este mes</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 text-lg">
                {editandoId ? 'Editar Tarjeta' : 'Nueva Tarjeta de Crédito'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre / Nombre de Tarjeta *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Visa Black, Mastercard Oro"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Banco emisor *</label>
                <input
                  type="text"
                  value={banco}
                  onChange={e => setBanco(e.target.value)}
                  placeholder="Ej: Itaú, Continental, GNB, Ueno, Sudameris"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Titular de la tarjeta</label>
                <select
                  value={personaId}
                  onChange={e => setPersonaId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Sin asignar / Familiar</option>
                  {personas.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Límite de Crédito (₲)</label>
                  <input
                    type="number"
                    value={limite}
                    onChange={e => setLimite(e.target.value)}
                    placeholder="10000000"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Saldo Deuda Actual (₲)</label>
                  <input
                    type="number"
                    value={deudaActual}
                    onChange={e => setDeudaActual(e.target.value)}
                    placeholder="2500000"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarTarjeta}
                disabled={guardando || !nombre.trim() || !banco.trim()}
                className="px-5 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-xl disabled:opacity-50 flex items-center gap-2"
              >
                {guardando && <Loader2 size={16} className="animate-spin" />}
                {editandoId ? 'Guardar Cambios' : 'Crear Tarjeta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
