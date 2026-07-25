'use client'
import { useState } from 'react'
import { TrendingDown, Plus } from 'lucide-react'
import { formatGsCompleto } from '@/lib/datos-demo'

const DEUDAS_DEMO = [
  {
    id: '1', nombre: 'Préstamo Auto', tipo: 'prestamo', persona: 'Augusto',
    saldo: 88369085, cuota: 2524831, cuotasPagadas: 25, cuotasTotales: 60,
    tasa: 18, color: '#2980B9'
  },
  {
    id: '2', nombre: 'Crediagil', tipo: 'prestamo', persona: 'Miska',
    saldo: 4000000, cuota: 500000, cuotasPagadas: 4, cuotasTotales: 12,
    tasa: 24, color: '#27AE60'
  },
]

type Deuda = typeof DEUDAS_DEMO[0]

function calcularEstrategia(deudas: Deuda[], extraMes: number, tipo: 'avalancha' | 'bola') {
  let lista = deudas.map(d => ({ ...d, saldo: d.saldo }))
  if (tipo === 'avalancha') lista.sort((a, b) => b.tasa - a.tasa)
  else lista.sort((a, b) => a.saldo - b.saldo)

  let meses = 0
  let interesesTotal = 0
  const MAX = 240

  while (lista.some(d => d.saldo > 0) && meses < MAX) {
    meses++
    let extraDisp = extraMes
    lista = lista.map(d => {
      if (d.saldo <= 0) return d
      const interes = (d.saldo * d.tasa / 100) / 12
      interesesTotal += interes
      let pago = d.cuota
      if (extraDisp > 0 && lista[0].id === d.id) { pago += extraDisp; extraDisp = 0 }
      return { ...d, saldo: Math.max(0, d.saldo - pago + interes) }
    })
  }
  return { meses, interesesTotal: Math.round(interesesTotal) }
}

export default function DeudasPage() {
  const [extra, setExtra] = useState('500000')
  const extraNum = parseInt(extra.replace(/\D/g,'')) || 0
  const totalDeuda = DEUDAS_DEMO.reduce((s, d) => s + d.saldo, 0)
  const avalancha = calcularEstrategia(DEUDAS_DEMO, extraNum, 'avalancha')
  const bola      = calcularEstrategia(DEUDAS_DEMO, extraNum, 'bola')
  const ahorroAvalancha = bola.interesesTotal - avalancha.interesesTotal

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Panel de Deudas</h2>
        <p className="text-sm text-gray-500 mt-1">Seguimiento independiente del presupuesto mensual</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total deuda</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatGsCompleto(totalDeuda)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Cuota mensual total</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {formatGsCompleto(DEUDAS_DEMO.reduce((s,d) => s + d.cuota, 0))}
          </p>
        </div>
      </div>

      {/* Lista de deudas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Mis deudas</h3>
          <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <Plus size={15}/> Agregar
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {DEUDAS_DEMO.map(d => {
            const pct = (d.cuotasPagadas / d.cuotasTotales) * 100
            return (
              <div key={d.id} className="px-5 py-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold" style={{ color: d.color }}>{d.nombre}</p>
                    <p className="text-xs text-gray-400">{d.persona} · {d.tasa}% anual · cuota {formatGsCompleto(d.cuota)}/mes</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{formatGsCompleto(d.saldo)}</p>
                    <p className="text-xs text-gray-400">{d.cuotasPagadas}/{d.cuotasTotales} cuotas</p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }}/>
                </div>
                <p className="text-xs text-gray-400 mt-1">{pct.toFixed(0)}% pagado</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Simulador de pago acelerado */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <TrendingDown size={18} className="text-blue-600"/> Simulador de pago acelerado
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monto extra disponible por mes (₲)
          </label>
          <input
            type="text"
            value={extra}
            onChange={e => setExtra(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2.5 w-48 focus:outline-none focus:ring-2 focus:ring-blue-300 font-bold"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
              🏦 Avalancha (mayor interés primero)
            </p>
            <p className="text-2xl font-bold text-blue-800">{avalancha.meses} meses</p>
            <p className="text-xs text-blue-600 mt-1">Intereses: {formatGsCompleto(avalancha.interesesTotal)}</p>
            {ahorroAvalancha > 0 && (
              <p className="text-xs text-emerald-700 font-semibold mt-1">
                Ahorrás {formatGsCompleto(ahorroAvalancha)} vs bola de nieve
              </p>
            )}
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">
              ⛄ Bola de nieve (menor saldo primero)
            </p>
            <p className="text-2xl font-bold text-purple-800">{bola.meses} meses</p>
            <p className="text-xs text-purple-600 mt-1">Intereses: {formatGsCompleto(bola.interesesTotal)}</p>
            <p className="text-xs text-gray-500 mt-1">Eliminás una deuda más rápido</p>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          * Simulación aproximada. Tasas de interés pueden variar. Consultá con tu banco para cifras exactas.
        </p>
      </div>
    </div>
  )
}
