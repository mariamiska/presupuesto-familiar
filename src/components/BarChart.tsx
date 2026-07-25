'use client'
import { formatGs } from '@/lib/datos-demo'

export function BarChart({
  ingresos, gastos, meses, mesActual
}: {
  ingresos: number[]
  gastos: number[]
  meses: string[]
  mesActual: number
}) {
  const max = Math.max(...ingresos, ...gastos, 1)

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-2 min-w-[700px] h-48">
        {meses.map((mes, i) => {
          const ing = ingresos[i]
          const gast = gastos[i]
          const isCurrent = i + 1 === mesActual
          const isFuture = i + 1 > mesActual
          return (
            <div key={mes} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end gap-0.5 h-36">
                {/* Barra ingresos */}
                <div
                  className={`flex-1 rounded-t transition-all ${isFuture ? 'opacity-30' : ''}`}
                  style={{ height: `${(ing / max) * 100}%`, backgroundColor: '#1ABC9C' }}
                  title={`Ingresos: ${formatGs(ing)}`}
                />
                {/* Barra gastos */}
                <div
                  className={`flex-1 rounded-t transition-all ${isFuture ? 'opacity-30' : ''}`}
                  style={{
                    height: gast > 0 ? `${(gast / max) * 100}%` : '2%',
                    backgroundColor: gast > ing ? '#E74C3C' : '#E67E22'
                  }}
                  title={`Gastos: ${formatGs(gast)}`}
                />
              </div>
              <span className={`text-xs ${isCurrent ? 'font-bold text-gray-800' : 'text-gray-400'}`}>
                {mes.slice(0, 3).toUpperCase()}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-gray-500 justify-center">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block"/>Ingresos</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-400 inline-block"/>Gastos</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block"/>Déficit</span>
      </div>
    </div>
  )
}
