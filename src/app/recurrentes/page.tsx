'use client'
import { useState, useEffect, useRef } from 'react'
import { Loader2, Repeat2, Pin, Plus, ExternalLink, Pencil, Check, X } from 'lucide-react'
import { formatGsCompleto } from '@/lib/supabase'
import Link from 'next/link'

type Gasto = {
  id: string
  fecha: string
  monto: number
  descripcion?: string
  nota?: string
  tipo_recurrencia: 'suscripcion' | 'fijo'
  personas?: { nombre: string; color: string }
  categorias?: { nombre: string; icono: string; color: string }
  tarjetas?: { id: string; nombre: string; banco: string }
}

type Tarjeta = {
  id: string
  nombre: string
  banco: string
  personas?: { nombre: string; color: string }
}

type Seccion = {
  tipo: 'suscripcion' | 'fijo'
  label: string
  descripcion: string
  icon: React.ReactNode
  colorCls: string
  badgeCls: string
}

const SECCIONES: Seccion[] = [
  {
    tipo: 'suscripcion',
    label: 'Suscripciones',
    descripcion: 'Gastos hormiga digitales (streaming, apps, membresías)',
    icon: <Repeat2 size={18}/>,
    colorCls: 'text-purple-700',
    badgeCls: 'bg-purple-50 text-purple-600 border-purple-100',
  },
  {
    tipo: 'fijo',
    label: 'Gastos fijos',
    descripcion: 'Compromisos mensuales del hogar (agua, internet, club, etc.)',
    icon: <Pin size={18}/>,
    colorCls: 'text-amber-700',
    badgeCls: 'bg-amber-50 text-amber-600 border-amber-100',
  },
]

export default function RecurrentesPage() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [cargando, setCargando] = useState(true)
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState<string>('')
  const [guardando, setGuardando] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    fetch('/api/gastos?recurrentes=1')
      .then(r => r.json())
      .then(data => { setGastos(Array.isArray(data) ? data : []); setCargando(false) })
    fetch('/api/tarjetas')
      .then(r => r.json())
      .then(data => setTarjetas(Array.isArray(data) ? data : []))
  }, [])

  function iniciarEdicion(g: Gasto) {
    setEditandoId(g.id)
    setTarjetaSeleccionada(g.tarjetas?.id ?? '')
    setTimeout(() => selectRef.current?.focus(), 50)
  }

  async function guardarTarjeta(gastoId: string) {
    setGuardando(true)
    await fetch(`/api/gastos/${gastoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'actualizar_tarjeta', tarjeta_id: tarjetaSeleccionada || null }),
    })
    const data = await fetch('/api/gastos?recurrentes=1').then(r => r.json())
    setGastos(Array.isArray(data) ? data : [])
    setEditandoId(null)
    setGuardando(false)
  }

  // Agrupar por concepto+persona para obtener el último monto de cada recurrente
  function agrupar(tipo: 'suscripcion' | 'fijo') {
    const filtrados = gastos.filter(g => g.tipo_recurrencia === tipo)
    // Deduplicar: un registro por concepto+persona (el más reciente ya viene primero)
    const vistos = new Set<string>()
    const unicos: Gasto[] = []
    for (const g of filtrados) {
      const key = `${g.descripcion}|${g.personas?.nombre}`
      if (!vistos.has(key)) { vistos.add(key); unicos.push(g) }
    }
    return unicos
  }

  const totalSuscripciones = agrupar('suscripcion').reduce((s, g) => s + g.monto, 0)
  const totalFijos = agrupar('fijo').reduce((s, g) => s + g.monto, 0)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Gastos recurrentes</h2>
          <p className="text-sm text-gray-500 mt-1">Suscripciones y fijos mensuales</p>
        </div>
        <Link
          href="/gastos"
          className="flex items-center gap-2 bg-[#2C3E50] text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-[#34495E] transition-colors"
        >
          <Plus size={16}/> Agregar
        </Link>
      </div>

      {/* Resumen total */}
      {!cargando && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="text-xs text-purple-500 font-medium mb-1">Suscripciones / mes</p>
            <p className="text-xl font-bold text-purple-700">{formatGsCompleto(totalSuscripciones)}</p>
            <p className="text-xs text-purple-400 mt-1">{agrupar('suscripcion').length} activas</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs text-amber-500 font-medium mb-1">Gastos fijos / mes</p>
            <p className="text-xl font-bold text-amber-700">{formatGsCompleto(totalFijos)}</p>
            <p className="text-xs text-amber-400 mt-1">{agrupar('fijo').length} compromisos</p>
          </div>
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="animate-spin" size={18}/> Cargando...
        </div>
      ) : (
        SECCIONES.map(sec => {
          const items = agrupar(sec.tipo)
          return (
            <div key={sec.tipo} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={sec.colorCls}>{sec.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">{sec.label}</h3>
                    <p className="text-xs text-gray-400">{sec.descripcion}</p>
                  </div>
                </div>
                {items.length > 0 && (
                  <span className={`text-xs border px-2 py-1 rounded-full font-semibold ${sec.badgeCls}`}>
                    {items.length}
                  </span>
                )}
              </div>

              {items.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm space-y-2">
                  <p>Sin {sec.label.toLowerCase()} registradas</p>
                  <Link href="/gastos" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
                    <ExternalLink size={12}/> Marcar un gasto como {sec.tipo === 'suscripcion' ? 'suscripción' : 'fijo'}
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {items.map(g => (
                    <div key={g.id} className="px-4 py-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">
                            {g.categorias?.icono && <span className="mr-1">{g.categorias.icono}</span>}
                            {g.descripcion ?? '—'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span style={{ color: g.personas?.color }}>{g.personas?.nombre}</span>
                            {g.nota && ` · ${g.nota}`}
                          </p>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <p className="font-bold text-gray-800">{formatGsCompleto(g.monto)}</p>
                          <p className="text-xs text-gray-400">/ mes</p>
                        </div>
                      </div>

                      {/* Fila de tarjeta editable */}
                      <div className="mt-1.5 flex items-center gap-2">
                        {editandoId === g.id ? (
                          <>
                            <select
                              ref={selectRef}
                              value={tarjetaSeleccionada}
                              onChange={e => setTarjetaSeleccionada(e.target.value)}
                              className="text-xs border border-blue-300 rounded px-2 py-1 bg-white text-gray-700 flex-1 max-w-[220px]"
                            >
                              <option value="">Sin tarjeta (efectivo)</option>
                              {tarjetas.map(t => (
                                <option key={t.id} value={t.id}>
                                  💳 {t.nombre} – {t.banco} ({t.personas?.nombre})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => guardarTarjeta(g.id)}
                              disabled={guardando}
                              className="p-1 rounded text-green-600 hover:bg-green-50 disabled:opacity-50"
                            >
                              {guardando ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                            </button>
                            <button
                              onClick={() => setEditandoId(null)}
                              className="p-1 rounded text-gray-400 hover:bg-gray-100"
                            >
                              <X size={13}/>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => iniciarEdicion(g)}
                            className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-700 group"
                          >
                            {g.tarjetas?.nombre ? (
                              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-medium group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                                💳 {g.tarjetas.nombre} – {g.tarjetas.banco}
                              </span>
                            ) : (
                              <span className="text-gray-300 group-hover:text-blue-500 transition-colors">+ tarjeta</span>
                            )}
                            <Pencil size={10} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      {!cargando && gastos.length === 0 && (
        <div className="text-center py-16 text-gray-400 space-y-3">
          <Repeat2 size={32} className="mx-auto opacity-30"/>
          <p className="text-sm">Todavía no hay gastos recurrentes registrados.</p>
          <p className="text-xs">Al registrar un gasto, elegí <strong>Suscripción</strong> o <strong>Fijo mensual</strong>.</p>
          <Link href="/gastos" className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline font-medium">
            <Plus size={14}/> Registrar gasto
          </Link>
        </div>
      )}
    </div>
  )
}
