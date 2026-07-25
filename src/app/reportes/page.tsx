export const dynamic = 'force-dynamic'

import { supabaseAdmin, MESES, formatGs, formatGsCompleto } from '@/lib/supabase'

const ANIO = new Date().getFullYear()

export default async function ReportesPage() {
  const db = supabaseAdmin()
  const { data: ingresosData } = await db
    .from('ingresos')
    .select('mes, monto')
    .eq('anio', ANIO)

  const { data: gastosData } = await db
    .from('gastos')
    .select('fecha, monto')
    .gte('fecha', `${ANIO}-01-01`)
    .lte('fecha', `${ANIO}-12-31`)

  const ingMeses = Array(12).fill(0)
  ingresosData?.forEach(r => { ingMeses[r.mes - 1] += r.monto })

  const gastMeses = Array(12).fill(0)
  gastosData?.forEach(g => {
    const m = new Date(g.fecha + 'T12:00:00').getMonth()
    gastMeses[m] += g.monto
  })

  const mesActual = new Date().getMonth() + 1
  const filas = MESES.map((mes, i) => {
    const ing = ingMeses[i]
    const gast = gastMeses[i]
    const balance = ing - gast
    const pct = ing > 0 ? (balance / ing) * 100 : null
    const futuro = i + 1 > mesActual && ing === 0
    return { mes, ing, gast, balance, pct, futuro }
  })

  const totalIng = ingMeses.reduce((a,b)=>a+b,0)
  const totalGast = gastMeses.reduce((a,b)=>a+b,0)
  const sinDatos = totalIng === 0 && totalGast === 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Reportes {ANIO}</h2>
        <p className="text-sm text-gray-500 mt-1">Ingresos vs gastos reales por mes</p>
      </div>

      {sinDatos ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-700">
          Sin datos todavía — <a href="/importar" className="underline font-medium">importá el Excel</a> para ver los reportes.
        </div>
      ) : (
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
                  <td className="px-4 py-3 text-right text-emerald-700 font-medium">{ing > 0 ? formatGs(ing) : '—'}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">{gast > 0 ? formatGs(gast) : '—'}</td>
                  <td className={`px-4 py-3 text-right font-bold ${futuro || ing === 0 ? 'text-gray-300' : balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {ing > 0 ? formatGs(balance) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {pct !== null ? (
                      <span className={`font-semibold ${pct >= 5 ? 'text-emerald-600' : pct >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                        {pct.toFixed(1)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {futuro || ing === 0
                      ? <span className="text-gray-300 text-xs">—</span>
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
                <td className="px-4 py-3 text-right text-emerald-700">{formatGsCompleto(totalIng)}</td>
                <td className="px-4 py-3 text-right text-red-600">{formatGsCompleto(totalGast)}</td>
                <td className="px-4 py-3 text-right">{formatGsCompleto(totalIng - totalGast)}</td>
                <td className="px-4 py-3"/>
                <td className="px-4 py-3"/>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
