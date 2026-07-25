export const dynamic = 'force-dynamic'

import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import { supabaseAdmin, MESES, formatGs, formatGsCompleto } from '@/lib/supabase'
import { BarChart } from '@/components/BarChart'

const MES_ACTUAL = new Date().getMonth() + 1
const ANIO_ACTUAL = new Date().getFullYear()

function semaforoColor(pct: number) {
  if (pct >= 5) return { label: '✓ Meta cumplida', text: 'text-emerald-700', bg: 'bg-emerald-500' }
  if (pct >= 0) return { label: '⚠ Cerca de la meta', text: 'text-amber-700', bg: 'bg-amber-400' }
  return { label: '✗ Déficit', text: 'text-red-700', bg: 'bg-red-500' }
}

export default async function Dashboard() {
  const db = supabaseAdmin()
  const mesIdx = MES_ACTUAL - 1

  // Ingresos del mes actual
  const { data: ingresosData } = await db
    .from('ingresos')
    .select('monto')
    .eq('mes', MES_ACTUAL)
    .eq('anio', ANIO_ACTUAL)

  const ingMes = ingresosData?.reduce((s, r) => s + r.monto, 0) ?? 0

  // Gastos del mes actual
  const fechaInicio = `${ANIO_ACTUAL}-${String(MES_ACTUAL).padStart(2,'0')}-01`
  const fechaFin = `${ANIO_ACTUAL}-${String(MES_ACTUAL).padStart(2,'0')}-31`

  const { data: gastosData } = await db
    .from('gastos')
    .select('monto, persona_id, personas(nombre, color)')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)

  const gastMes = gastosData?.reduce((s, r) => s + r.monto, 0) ?? 0

  // Personas para el resumen
  const { data: personasData } = await db
    .from('personas')
    .select('id, nombre, color')
    .eq('activa', true)
    .order('nombre')

  // Presupuesto del mes por persona
  const { data: presupuestoData } = await db
    .from('presupuesto')
    .select('monto_planificado, concepto_id, conceptos(persona_id)')
    .eq('mes', MES_ACTUAL)
    .eq('anio', ANIO_ACTUAL)

  // Gastos reales por persona
  const gastosPorPersona: Record<string, number> = {}
  gastosData?.forEach(g => {
    const pid = g.persona_id
    gastosPorPersona[pid] = (gastosPorPersona[pid] ?? 0) + g.monto
  })

  // Presupuesto por persona
  const presupuestoPorPersona: Record<string, number> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  presupuestoData?.forEach((p: any) => {
    const pid = p.conceptos?.persona_id
    if (pid) presupuestoPorPersona[pid] = (presupuestoPorPersona[pid] ?? 0) + p.monto_planificado
  })

  // Ingresos y gastos anuales para el gráfico
  const { data: ingresosAnuales } = await db
    .from('ingresos')
    .select('mes, monto')
    .eq('anio', ANIO_ACTUAL)

  const ingMeses = Array(12).fill(0)
  ingresosAnuales?.forEach(r => { ingMeses[r.mes - 1] += r.monto })

  const gastMeses = Array(12).fill(0)
  // Para el gráfico anual necesitamos gastos de todo el año
  const { data: gastosAnuales } = await db
    .from('gastos')
    .select('fecha, monto')
    .gte('fecha', `${ANIO_ACTUAL}-01-01`)
    .lte('fecha', `${ANIO_ACTUAL}-12-31`)

  gastosAnuales?.forEach(g => {
    const m = new Date(g.fecha).getMonth()
    gastMeses[m] += g.monto
  })

  const balance = ingMes - gastMes
  const pct = ingMes > 0 ? (balance / ingMes) * 100 : 0
  const semaforo = semaforoColor(pct)
  const sinDatos = ingMes === 0 && gastMes === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{MESES[mesIdx]} {ANIO_ACTUAL}</h2>
          <p className="text-sm text-gray-500 mt-1">Resumen del mes actual</p>
        </div>
        {!sinDatos && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
            ${pct >= 5 ? 'bg-emerald-100 text-emerald-800' : pct >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
            {pct >= 5 ? <TrendingUp size={16}/> : pct >= 0 ? <Minus size={16}/> : <TrendingDown size={16}/>}
            {semaforo.label} · {pct.toFixed(1)}%
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
          <div className="grid grid-cols-3 gap-4">
            <Card label="Ingresos del mes" value={formatGsCompleto(ingMes)} color="text-emerald-600" />
            <Card label="Gastos del mes"   value={formatGsCompleto(gastMes)} color="text-red-600" />
            <Card
              label="Balance / Ahorro"
              value={formatGsCompleto(balance)}
              color={balance >= 0 ? 'text-emerald-600' : 'text-red-600'}
              sub={`Meta 5%: ${formatGsCompleto(ingMes * 0.05)}`}
            />
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">Progreso de ahorro mensual</span>
              <span className={`font-bold ${semaforo.text}`}>{pct.toFixed(1)}% / meta 5%</span>
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

      {/* Gastos por persona */}
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

      {/* Gráfico anual */}
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

function Card({ label, value, color, sub }: {
  label: string; value: string; color: string; sub?: string
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
