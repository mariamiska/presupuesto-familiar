import { MESES, INGRESOS_MES, GASTOS_MES, formatGs, formatGsCompleto } from '@/lib/datos-demo'

export default function ReportesPage() {
  const filas = MESES.map((mes, i) => {
    const ing = INGRESOS_MES[i]
    const gast = GASTOS_MES[i]
    const balance = ing - gast
    const pct = ing > 0 && gast > 0 ? (balance / ing) * 100 : null
    const futuro = gast === 0
    return { mes, ing, gast, balance, pct, futuro }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Reportes 2026</h2>
        <p className="text-sm text-gray-500 mt-1">Comparación planificado vs real por mes</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#2C3E50] text-white text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Mes</th>
              <th className="px-4 py-3 text-right">Ingresos</th>
              <th className="px-4 py-3 text-right">Gastos</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-center">% Ahorro</th>
              <th className="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filas.map(({ mes, ing, gast, balance, pct, futuro }) => (
              <tr key={mes} className={`${futuro ? 'opacity-40' : 'hover:bg-gray-50'}`}>
                <td className="px-4 py-3 font-medium">{mes}</td>
                <td className="px-4 py-3 text-right text-emerald-700 font-medium">{formatGs(ing)}</td>
                <td className="px-4 py-3 text-right text-red-600 font-medium">{futuro ? '—' : formatGs(gast)}</td>
                <td className={`px-4 py-3 text-right font-bold ${futuro ? 'text-gray-300' : balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {futuro ? '—' : formatGs(balance)}
                </td>
                <td className="px-4 py-3 text-center">
                  {pct !== null ? (
                    <span className={`font-semibold ${pct >= 5 ? 'text-emerald-600' : pct >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                      {pct.toFixed(1)}%
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {futuro ? <span className="text-gray-300 text-xs">Futuro</span>
                  : pct === null ? <span className="text-gray-400 text-xs">Sin datos</span>
                  : pct >= 5 ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">✓ Meta</span>
                  : pct >= 0 ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">⚠ Cerca</span>
                  : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">✗ Déficit</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
              <td className="px-4 py-3">TOTAL AÑO</td>
              <td className="px-4 py-3 text-right text-emerald-700">{formatGsCompleto(INGRESOS_MES.reduce((a,b)=>a+b,0))}</td>
              <td className="px-4 py-3 text-right text-red-600">{formatGsCompleto(GASTOS_MES.reduce((a,b)=>a+b,0))}</td>
              <td className="px-4 py-3 text-right">
                {formatGsCompleto(INGRESOS_MES.reduce((a,b)=>a+b,0) - GASTOS_MES.reduce((a,b)=>a+b,0))}
              </td>
              <td className="px-4 py-3"/>
              <td className="px-4 py-3"/>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
