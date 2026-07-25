'use client'
import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Calculator } from 'lucide-react'
import { INGRESOS_MES, GASTOS_MES, MES_ACTUAL, MESES, formatGsCompleto, calcularAhorro } from '@/lib/datos-demo'

const CONCEPTOS = [
  'Alimentación','Ropa','Salud','Educación','Entretenimiento',
  'Transporte','Combustible','Hogar','Tecnología','Viajes','Otro'
]
const PERSONAS = ['Augusto','Miska','Niños','Casa','Familia']

export default function SimularPage() {
  const [monto, setMonto] = useState('')
  const [persona, setPersona] = useState('')
  const [concepto, setConcepto] = useState('')
  const [resultado, setResultado] = useState<null | ReturnType<typeof simular>>(null)

  function simular(montoNum: number) {
    const mesIdx = MES_ACTUAL - 1
    const ing = INGRESOS_MES[mesIdx]
    const gastActual = GASTOS_MES[mesIdx]
    const { balance: balanceActual, pct: pctActual } = calcularAhorro(ing, gastActual)
    const gastNuevo = gastActual + montoNum
    const balanceNuevo = ing - gastNuevo
    const pctNuevo = ing > 0 ? (balanceNuevo / ing) * 100 : 0
    const metaCumplida = pctNuevo >= 5
    const enDeuda = balanceNuevo < 0
    const cuotaEquiv = Math.round(montoNum / 3)
    return { ing, gastActual, balanceActual, pctActual, gastNuevo, balanceNuevo, pctNuevo, metaCumplida, enDeuda, cuotaEquiv, montoNum }
  }

  function handleSimular() {
    const n = parseInt(monto.replace(/\D/g,''))
    if (!n || n <= 0) return
    setResultado(simular(n))
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">¿Puedo gastar esto?</h2>
        <p className="text-sm text-gray-500 mt-1">Simulá un gasto antes de realizarlo</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monto (₲)</label>
          <input
            type="text"
            placeholder="ej: 500000"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
            <select
              value={persona}
              onChange={e => setPersona(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Seleccioná</option>
              {PERSONAS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Seleccioná</option>
              {CONCEPTOS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={handleSimular}
          className="w-full bg-[#2C3E50] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#34495E] transition-colors"
        >
          <Calculator size={18}/> Simular gasto
        </button>
      </div>

      {resultado && (
        <div className={`rounded-xl p-6 border-2 space-y-4
          ${resultado.metaCumplida ? 'bg-emerald-50 border-emerald-200' : resultado.enDeuda ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>

          <div className="flex items-center gap-3">
            {resultado.metaCumplida
              ? <CheckCircle className="text-emerald-600" size={28}/>
              : resultado.enDeuda
              ? <XCircle className="text-red-600" size={28}/>
              : <AlertTriangle className="text-amber-600" size={28}/>
            }
            <div>
              <p className="font-bold text-lg">
                {resultado.metaCumplida
                  ? '✓ Podés gastarlo sin problema'
                  : resultado.enDeuda
                  ? '✗ Te va a dejar en déficit'
                  : '⚠ Podés, pero perdés la meta del 5%'}
              </p>
              <p className="text-sm text-gray-600">{MESES[MES_ACTUAL-1]} 2026</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Balance actual" value={formatGsCompleto(resultado.balanceActual)} />
            <Stat label="Balance después" value={formatGsCompleto(resultado.balanceNuevo)} highlight={resultado.enDeuda} />
            <Stat label="Ahorro actual" value={`${resultado.pctActual.toFixed(1)}%`} />
            <Stat label="Ahorro después" value={`${resultado.pctNuevo.toFixed(1)}%`} highlight={resultado.pctNuevo < 5} />
          </div>

          {!resultado.metaCumplida && (
            <div className="bg-white/70 rounded-lg p-4 text-sm space-y-1">
              <p className="font-semibold text-gray-700">Alternativas:</p>
              <p>• Dividir en 3 cuotas de {formatGsCompleto(resultado.cuotaEquiv)}/mes</p>
              <p>• Esperar al mes que viene si el balance mejora</p>
              {resultado.enDeuda && <p>• Reducir otro gasto este mes primero</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white/60 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-bold text-base ${highlight ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}
