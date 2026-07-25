import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import {
  MESES, INGRESOS_MES, GASTOS_MES,
  MES_ACTUAL, formatGs, formatGsCompleto, calcularAhorro, semaforoColor
} from '@/lib/datos-demo'
import { BarChart } from '@/components/BarChart'

const mesIdx = MES_ACTUAL - 1
const ingMes = INGRESOS_MES[mesIdx]
const gastMes = GASTOS_MES[mesIdx]
const { balance, pct } = calcularAhorro(ingMes, gastMes)
const semaforo = semaforoColor(pct)

const personasResumen = [
  { nombre: 'Augusto', color: '#2980B9', planificado: 4013806, real: 3500000 },
  { nombre: 'Miska',   color: '#27AE60', planificado: 2800000, real: 2100000 },
  { nombre: 'Niños',   color: '#F39C12', planificado: 1450000, real: 1200000 },
  { nombre: 'Casa',    color: '#D35400', planificado: 3200000, real: 2800000 },
  { nombre: 'Familia', color: '#8E44AD', planificado:  850000, real:  600000 },
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{MESES[mesIdx]} 2026</h2>
          <p className="text-sm text-gray-500 mt-1">Resumen del mes actual</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
          ${pct >= 5 ? 'bg-emerald-100 text-emerald-800' : pct >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
          {pct >= 5 ? <TrendingUp size={16}/> : pct >= 0 ? <Minus size={16}/> : <TrendingDown size={16}/>}
          {semaforo.label} · {pct.toFixed(1)}%
        </div>
      </div>

      {/* Tarjetas principales */}
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

      {/* Barra de progreso de ahorro */}
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
            No hay gastos reales cargados para {MESES[mesIdx]}. Importá el Excel o agregá gastos manualmente.
          </div>
        )}
      </div>

      {/* Gastos por persona */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-4">Gastos por persona — {MESES[mesIdx]}</h3>
        <div className="space-y-3">
          {personasResumen.map(p => {
            const usoPct = p.planificado > 0 ? (p.real / p.planificado) * 100 : 0
            return (
              <div key={p.nombre}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium" style={{ color: p.color }}>{p.nombre}</span>
                  <span className="text-gray-500">
                    {formatGs(p.real)} / {formatGs(p.planificado)}
                    <span className={`ml-2 font-semibold ${usoPct > 100 ? 'text-red-600' : 'text-gray-600'}`}>
                      {usoPct.toFixed(0)}%
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(usoPct, 100)}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Gráfico anual */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-4">Ingresos vs Gastos — 2026</h3>
        <BarChart
          ingresos={INGRESOS_MES}
          gastos={GASTOS_MES}
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
