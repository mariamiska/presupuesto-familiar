'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { MESES, formatGsCompleto } from '@/lib/supabase'

type Pago = {
  id: string
  fecha: string
  monto: number
  descripcion?: string
  pagado?: boolean
  cuota_num?: number | null
  cuotas_total?: number | null
  personas?: { nombre: string; color: string }
  categorias?: { nombre: string; color: string; icono: string }
}

export default function PagosPage() {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [pagos, setPagos] = useState<Pago[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const res = await fetch(`/api/gastos?mes=${mes}&anio=${anio}`)
    const data = await res.json()
    setPagos(Array.isArray(data) ? data : [])
    setCargando(false)
  }, [mes, anio])

  useEffect(() => { cargar() }, [cargar])

  // Optimista: la fila cambia al instante y se revierte sólo si el guardado falla.
  async function alternar(p: Pago) {
    const valor = !p.pagado
    setGuardando(p.id)
    setPagos(prev => prev.map(x => x.id === p.id ? { ...x, pagado: valor } : x))
    const res = await fetch(`/api/gastos/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pagado: valor }),
    })
    if (!res.ok) setPagos(prev => prev.map(x => x.id === p.id ? { ...x, pagado: !valor } : x))
    setGuardando(null)
  }

  function mover(d: number) {
    const m = mes + d
    if (m < 1) { setMes(12); setAnio(anio - 1) }
    else if (m > 12) { setMes(1); setAnio(anio + 1) }
    else setMes(m)
  }

  const orden = [...pagos].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const total = pagos.reduce((s, p) => s + p.monto, 0)
  const pagado = pagos.filter(p => p.pagado).reduce((s, p) => s + p.monto, 0)
  const pendiente = total - pagado
  const pct = total > 0 ? (pagado / total) * 100 : 0
  const hoyISO = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[var(--text-1)]">Pagos del mes</h2>
          <p className="text-sm text-[var(--text-3)] mt-1">Marcá cada pago a medida que lo hacés</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => mover(-1)} aria-label="Mes anterior" className="chip"><ChevronLeft size={16}/></button>
          <span className="text-sm font-semibold px-2 whitespace-nowrap">{MESES[mes - 1]} {anio}</span>
          <button onClick={() => mover(1)} aria-label="Mes siguiente" className="chip"><ChevronRight size={16}/></button>
        </div>
      </div>

      <div className="card-pad space-y-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-[var(--text-3)]">Total del mes</p>
            <p className="text-lg font-bold">{formatGsCompleto(total)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-3)]">Pagado</p>
            <p className="text-lg font-bold" style={{ color: 'var(--ok)' }}>{formatGsCompleto(pagado)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-3)]">Falta pagar</p>
            <p className="text-lg font-bold" style={{ color: pendiente > 0 ? 'var(--bad)' : 'var(--ok)' }}>
              {formatGsCompleto(pendiente)}
            </p>
          </div>
        </div>
        <div className="h-2 bg-[var(--border-soft)] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: 'var(--ok)' }}/>
        </div>
        <p className="text-xs text-[var(--text-3)] text-center">
          {pagos.filter(p => p.pagado).length} de {pagos.length} pagos · {pct.toFixed(0)}%
        </p>
      </div>

      <div className="card overflow-hidden">
        {cargando ? (
          <div className="p-8 text-center text-[var(--text-3)]">
            <Loader2 className="animate-spin mx-auto" size={20}/>
          </div>
        ) : orden.length === 0 ? (
          <p className="p-8 text-center text-[var(--text-3)] text-sm">Sin pagos cargados para este mes.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-3)] text-xs">
                <th className="text-left font-medium px-3 py-2.5 w-12">Día</th>
                <th className="text-left font-medium px-3 py-2.5">Concepto</th>
                <th className="text-left font-medium px-3 py-2.5 hidden sm:table-cell">Quién</th>
                <th className="text-right font-medium px-3 py-2.5">Monto</th>
                <th className="text-center font-medium px-3 py-2.5 w-20">Pagado</th>
              </tr>
            </thead>
            <tbody>
              {orden.map(p => {
                // Vencido = ya pasó la fecha y sigue sin marcarse.
                const vencido = !p.pagado && p.fecha < hoyISO
                return (
                  <tr key={p.id}
                    className={`border-b border-[var(--border-soft)] last:border-0 ${p.pagado ? 'opacity-55' : ''}`}>
                    <td className="px-3 py-2.5 text-[var(--text-3)] tabular-nums">{p.fecha.slice(8, 10)}</td>
                    <td className="px-3 py-2.5">
                      <span className={p.pagado ? 'line-through' : 'font-medium'}>
                        {p.categorias?.icono} {p.descripcion ?? '—'}
                      </span>
                      {p.cuotas_total ? (
                        <span className="text-xs text-[var(--text-3)] ml-1.5">
                          {p.cuota_num}/{p.cuotas_total}
                        </span>
                      ) : null}
                      {vencido && (
                        <span className="text-xs ml-1.5 font-semibold" style={{ color: 'var(--bad)' }}>vencido</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell text-xs"
                      style={{ color: p.personas?.color ?? 'var(--text-3)' }}>
                      {p.personas?.nombre}
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${p.pagado ? 'line-through' : ''}`}>
                      {formatGsCompleto(p.monto)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => alternar(p)} disabled={guardando === p.id}
                        aria-label={p.pagado ? `Desmarcar ${p.descripcion}` : `Marcar ${p.descripcion} como pagado`}
                        aria-pressed={!!p.pagado}
                        className="p-1 disabled:opacity-40 active:scale-90 transition-transform">
                        {p.pagado
                          ? <CheckCircle2 size={22} style={{ color: 'var(--ok)' }}/>
                          : <Circle size={22} className="text-[var(--text-3)]"/>}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
