export const dynamic = 'force-dynamic'

import React from 'react'
import { TrendingUp, TrendingDown, Minus, AlertCircle, Bell, ArrowDownCircle, ArrowUpCircle, Wallet, CreditCard } from 'lucide-react'
import { supabaseAdmin, MESES, formatGs, formatGsCompleto } from '@/lib/supabase'
import { BarChart } from '@/components/BarChart'

function semaforoColor(pct: number) {
  if (pct >= 5) return { label: '✓ Meta cumplida', text: 'text-emerald-700', bg: 'bg-emerald-500' }
  if (pct >= 0) return { label: '⚠ Cerca de la meta', text: 'text-amber-700', bg: 'bg-amber-400' }
  return { label: '✗ Déficit', text: 'text-red-700', bg: 'bg-red-500' }
}

function primerDia(anio: number, mes: number) {
  return `${anio}-${String(mes).padStart(2, '0')}-01`
}

function ultimoDia(anio: number, mes: number) {
  return new Date(anio, mes, 0).toISOString().split('T')[0]
}

function deltaLabel(actual: number, anterior: number) {
  if (anterior === 0) return null
  const pct = ((actual - anterior) / anterior) * 100
  const signo = pct >= 0 ? '+' : ''
  return { pct: `${signo}${pct.toFixed(0)}%`, sube: pct > 0 }
}

export default async function Dashboard() {
  const MES_ACTUAL = new Date().getMonth() + 1
  const ANIO_ACTUAL = new Date().getFullYear()
  const mesIdx = MES_ACTUAL - 1

  const MES_ANT = MES_ACTUAL === 1 ? 12 : MES_ACTUAL - 1
  const ANIO_ANT = MES_ACTUAL === 1 ? ANIO_ACTUAL - 1 : ANIO_ACTUAL

  const db = supabaseAdmin()

  const [
    { data: ingresosData },
    { data: gastosData },
    { data: ingresosAntData },
    { data: gastosAntData },
    { data: vencimientos },
    { data: personasData },
    { data: presupuestoData },
    { data: ingresosAnuales },
    { data: gastosAnuales },
    { data: deudasActivas },
  ] = await Promise.all([
    db.from('ingresos').select('monto').eq('mes', MES_ACTUAL).eq('anio', ANIO_ACTUAL),
    db.from('gastos').select('monto, persona_id, personas(nombre, color)')
      .gte('fecha', primerDia(ANIO_ACTUAL, MES_ACTUAL))
      .lte('fecha', ultimoDia(ANIO_ACTUAL, MES_ACTUAL)),
    db.from('ingresos').select('monto').eq('mes', MES_ANT).eq('anio', ANIO_ANT),
    db.from('gastos').select('monto')
      .gte('fecha', primerDia(ANIO_ANT, MES_ANT))
      .lte('fecha', ultimoDia(ANIO_ANT, MES_ANT)),
    db.from('gastos')
      .select('id, fecha_vencimiento, monto, descripcion, personas(nombre, color)')
      .gte('fecha_vencimiento', new Date().toISOString().split('T')[0])
      .lte('fecha_vencimiento', new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0])
      .order('fecha_vencimiento', { ascending: true })
      .limit(10),
    db.from('personas').select('id, nombre, color').eq('activa', true).order('nombre'),
    db.from('presupuesto').select('monto_planificado, concepto_id, conceptos(persona_id)')
      .eq('mes', MES_ACTUAL).eq('anio', ANIO_ACTUAL),
    db.from('ingresos').select('mes, monto').eq('anio', ANIO_ACTUAL),
    db.from('gastos').select('fecha, monto')
      .gte('fecha', `${ANIO_ACTUAL}-01-01`)
      .lte('fecha', `${ANIO_ACTUAL}-12-31`),
    db.from('deudas')
      .select('id, nombre, cuota_mensual, cuotas_totales, cuotas_pagadas, personas(nombre, color)')
      .eq('activa', true)
      .not('cuota_mensual', 'is', null)
      .order('cuota_mensual', { ascending: false }),
  ])

  const ingMes = ingresosData?.reduce((s, r) => s + r.monto, 0) ?? 0
  const gastMes = gastosData?.reduce((s, r) => s + r.monto, 0) ?? 0
  const ingAnt = ingresosAntData?.reduce((s, r) => s + r.monto, 0) ?? 0
  const gastAnt = gastosAntData?.reduce((s, r) => s + r.monto, 0) ?? 0

  const gastosPorPersona: Record<string, number> = {}
  gastosData?.forEach(g => {
    gastosPorPersona[g.persona_id] = (gastosPorPersona[g.persona_id] ?? 0) + g.monto
  })

  const presupuestoPorPersona: Record<string, number> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  presupuestoData?.forEach((p: any) => {
    const pid = p.conceptos?.persona_id
    if (pid) presupuestoPorPersona[pid] = (presupuestoPorPersona[pid] ?? 0) + p.monto_planificado
  })

  const ingMeses = Array(12).fill(0)
  ingresosAnuales?.forEach(r => { ingMeses[r.mes - 1] += r.monto })

  const gastMeses = Array(12).fill(0)
  gastosAnuales?.forEach(g => {
    const m = new Date(g.fecha + 'T12:00:00').getMonth()
    gastMeses[m] += g.monto
  })

  // Deudas activas con cuota — para sección virtual en dashboard
  type DeudaActiva = {
    id: string; nombre: string; cuota_mensual: number
    cuotas_totales?: number | null; cuotas_pagadas?: number | null
    personas?: { nombre: string; color: string }[] | { nombre: string; color: string } | null
  }
  const cuotasDeudas = (deudasActivas ?? []) as DeudaActiva[]
  const totalCuotasDeuda = cuotasDeudas.reduce((s, d) => s + d.cuota_mensual, 0)

  const balance = ingMes - gastMes
  const pct = ingMes > 0 ? (balance / ingMes) * 100 : 0
  const semaforo = semaforoColor(pct)
  const sinDatos = ingMes === 0 && gastMes === 0

  const deltaIng = deltaLabel(ingMes, ingAnt)
  const deltaGast = deltaLabel(gastMes, gastAnt)

  const hoy = new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">{MESES[mesIdx]} {ANIO_ACTUAL}</h2>
          <p className="text-sm text-gray-500 mt-1">Resumen del mes actual</p>
        </div>
        {!sinDatos && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold shrink-0
            ${pct >= 5 ? 'bg-emerald-100 text-emerald-800' : pct >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
            {pct >= 5 ? <TrendingUp size={14}/> : pct >= 0 ? <Minus size={14}/> : <TrendingDown size={14}/>}
            <span className="hidden sm:inline">{semaforo.label} · </span>{pct.toFixed(1)}%
          </div>
        )}
      </div>

      {sinDatos ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={20}/>
          <div>
            <p className="font-semibold text-amber-800">Sin datos para este mes</p>
            <p className="text-sm text-amber-700 mt-1">
              Todavía no hay ingresos ni gastos cargados. Podés <a href="/importar" className="underline font-medium">importar el Excel</a> o <a href="/gastos" className="underline font-medium">agregar gastos manualmente</a>.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <Card
              label="Ingresos del mes"
              value={formatGsCompleto(ingMes)}
              color="text-emerald-600"
              icon={<ArrowDownCircle size={18} className="text-emerald-500"/>}
              delta={deltaIng ? { label: `${deltaIng.pct} vs ${MESES[MES_ANT - 1]}`, sube: deltaIng.sube } : undefined}
            />
            <Card
              label="Gastos del mes"
              value={formatGsCompleto(gastMes)}
              color="text-red-500"
              icon={<ArrowUpCircle size={18} className="text-red-400"/>}
              delta={deltaGast ? { label: `${deltaGast.pct} vs ${MESES[MES_ANT - 1]}`, sube: deltaGast.sube } : undefined}
              deltaInvert
            />
            <Card
              label="Balance / Ahorro"
              value={formatGsCompleto(balance)}
              color={balance >= 0 ? 'text-emerald-600' : 'text-red-600'}
              icon={<Wallet size={18} className={balance >= 0 ? 'text-emerald-500' : 'text-red-400'}/>}
              sub={`Meta 5%: ${formatGsCompleto(ingMes * 0.05)}`}
            />
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="font-semibold text-gray-700 text-sm">Progreso de ahorro</span>
              <span className={`font-bold text-sm shrink-0 ${semaforo.text}`}>{pct.toFixed(1)}% / meta 5%</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${semaforo.bg}`}
                style={{ width: `${Math.min(Math.max(pct, 0), 20) * 5}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span><span>5% meta</span><span>10%</span><span>15%</span><span>20%</span>
            </div>
            {gastMes === 0 && (
              <div className="flex items-center gap-2 mt-3 text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                <AlertCircle size={14}/>
                No hay gastos reales para {MESES[mesIdx]}. <a href="/gastos" className="underline ml-1">Agregar gastos</a>
              </div>
            )}
          </div>
        </>
      )}

      {personasData && personasData.length > 0 && !sinDatos && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Gastos por persona — {MESES[mesIdx]}</h3>
          <div className="space-y-3">
            {personasData.map(p => {
              const real = gastosPorPersona[p.id] ?? 0
              const plan = presupuestoPorPersona[p.id] ?? 0
              const usoPct = plan > 0 ? (real / plan) * 100 : 0
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium" style={{ color: p.color }}>{p.nombre}</span>
                    <span className="text-gray-500">
                      {formatGs(real)}{plan > 0 ? ` / ${formatGs(plan)}` : ''}
                      {plan > 0 && (
                        <span className={`ml-2 font-semibold ${usoPct > 100 ? 'text-red-600' : 'text-gray-600'}`}>
                          {usoPct.toFixed(0)}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(usoPct || (real > 0 ? 50 : 0), 100)}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {vencimientos && vencimientos.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-orange-100">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-orange-500"/>
            <h3 className="font-semibold text-gray-700">Vencimientos próximos <span className="text-xs text-gray-400 font-normal">(próximos 15 días)</span></h3>
          </div>
          <div className="space-y-2">
            {vencimientos.map((v: {
              id: string
              fecha_vencimiento: string
              monto: number
              descripcion: string
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              personas: any
            }) => {
              const venc = new Date(v.fecha_vencimiento + 'T12:00:00')
              const diasRestantes = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
              const urgente = diasRestantes <= 3
              return (
                <div key={v.id} className={`flex items-center justify-between rounded-lg px-4 py-3.5 ${urgente ? 'bg-red-50 border border-red-100' : 'bg-orange-50 border border-orange-100'}`}>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{v.descripcion ?? '—'}</p>
                    <p className="text-xs mt-0.5" style={{ color: v.personas?.color }}>{v.personas?.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800 text-sm">{formatGs(v.monto)}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${urgente ? 'text-red-600' : 'text-orange-600'}`}>
                      {diasRestantes === 0 ? '¡Vence hoy!' : diasRestantes === 1 ? 'Vence mañana' : `${diasRestantes} días`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {cuotasDeudas.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-orange-500"/>
              <h3 className="font-semibold text-gray-700">Cuotas de deudas este mes</h3>
            </div>
            <span className="text-sm font-bold text-orange-600">{formatGsCompleto(totalCuotasDeuda)}</span>
          </div>
          <div className="space-y-3">
            {cuotasDeudas.map(d => {
              const restantes = d.cuotas_totales != null && d.cuotas_pagadas != null
                ? d.cuotas_totales - d.cuotas_pagadas
                : null
              const pct = d.cuotas_totales && d.cuotas_pagadas != null
                ? Math.round((d.cuotas_pagadas / d.cuotas_totales) * 100)
                : null
              const color = (d.personas as { nombre: string; color: string } | null)?.color ?? '#F97316'
              return (
                <div key={d.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">{d.nombre}</span>
                      <span className="text-xs text-gray-400" style={{ color }}>
                        {(d.personas as { nombre: string; color: string } | null)?.nombre}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-gray-800">{formatGs(d.cuota_mensual)}</span>
                      {restantes != null && (
                        <span className="text-xs text-gray-400 ml-2">
                          {restantes} {restantes === 1 ? 'cuota' : 'cuotas'} restantes
                        </span>
                      )}
                    </div>
                  </div>
                  {pct !== null && (
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${pct}%` }}/>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {ingMes > 0 && (
            <p className="text-xs text-gray-400 mt-4">
              Las cuotas representan el <span className="font-semibold text-orange-500">{((totalCuotasDeuda / ingMes) * 100).toFixed(1)}%</span> de los ingresos del mes.
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-4">Ingresos vs Gastos — {ANIO_ACTUAL}</h3>
        <BarChart
          ingresos={ingMeses}
          gastos={gastMeses}
          meses={MESES}
          mesActual={MES_ACTUAL}
        />
      </div>
    </div>
  )
}

function Card({ label, value, color, sub, icon, delta, deltaInvert }: {
  label: string
  value: string
  color: string
  sub?: string
  icon?: React.ReactNode
  delta?: { label: string; sube: boolean }
  deltaInvert?: boolean
}) {
  const deltaPositivo = delta ? (deltaInvert ? !delta.sube : delta.sube) : false
  return (
    <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
        {icon}
      </div>
      <p className={`text-xl md:text-2xl font-bold ${color} leading-tight`}>{value}</p>
      {delta && (
        <p className={`text-xs mt-1 font-medium ${deltaPositivo ? 'text-emerald-600' : 'text-red-500'}`}>
          {delta.sube ? '▲' : '▼'} {delta.label}
        </p>
      )}
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
