'use client'
import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Calculator } from 'lucide-react'
import { MESES, formatGsCompleto } from '@/lib/supabase'

const CONCEPTOS = [
  'Alimentación','Ropa','Salud','Educación','Entretenimiento',
  'Transporte','Combustible','Hogar','Tecnología','Viajes','Otro'
]
const PERSONAS = ['Augusto','Miska','Niños','Casa','Familia']

type Props = { ingMes: number; gastMes: number; mesActual: number }

export default function SimularClient({ ingMes, gastMes, mesActual }: Props) {
  const [monto, setMonto] = useState('')
  const [persona, setPersona] = useState('')
  const [concepto, setConcepto] = useState('')
  const [resultado, setResultado] = useState<null | ReturnType<typeof simular>>(null)

  function simular(montoNum: number) {
    const balanceActual = ingMes - gastMes
    const pctActual = ingMes > 0 ? (balanceActual / ingMes) * 100 : 0
    const gastNuevo = gastMes + montoNum
    const balanceNuevo = ingMes - gastNuevo
    const pctNuevo = ingMes > 0 ? (balanceNuevo / ingMes) * 100 : 0
    const metaCumplida = pctNuevo >= 5
    const enDeuda = balanceNuevo < 0
    const cuotaEquiv = Math.round(montoNum / 3)
    return { ingMes, gastMes, balanceActual, pctActual, gastNuevo, balanceNuevo, pctNuevo, metaCumplida, enDeuda, cuotaEquiv, montoNum }
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
        <p className="text-sm text-gray-500 mt-1">
          Simulá un gasto sobre el balance real de {MESES[mesActual - 1]}
        </p>
      </div>

      {ingMes === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Sin ingresos cargados para este mes. <a href="/importar" className="underline">Importá el Excel</a> para usar datos reales.
        </div>
      )}

      {/* Balance actual visible antes de simular */}
      {ingMes > 0 && !resultado && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Balance disponible ahora</span>
            <span className={`font-bold text-base ${ingMes - gastMes >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatGsCompleto(ingMes - gastMes)}
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">¿Cuánto querés gastar? (₲)</label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="ej: 500000"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Persona (opcional)</label>
            <select value={persona} onChange={e => setPersona(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">Todas</option>
              {PERSONAS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Categoría (opcional)</label>
            <select value={concepto} onChange={e => setConcepto(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">Seleccioná</option>
              {CONCEPTOS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={handleSimular}
          className="w-full bg-[#2C3E50] text-white py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:bg-[#34495E] transition-colors active:scale-[0.98]"
        >
          <Calculator size={18}/> ¿Puedo gastarlo?
        </button>
      </div>

      {resultado && (
        <div className={`rounded-2xl border-2 overflow-hidden
          ${resultado.metaCumplida ? 'border-emerald-200' : resultado.enDeuda ? 'border-red-200' : 'border-amber-200'}`}>
          {/* Header con veredicto */}
          <div className={`px-5 py-4 flex items-center gap-3
            ${resultado.metaCumplida ? 'bg-emerald-500' : resultado.enDeuda ? 'bg-red-500' : 'bg-amber-400'}`}>
            {resultado.metaCumplida
              ? <CheckCircle className="text-white shrink-0" size={26}/>
              : resultado.enDeuda
              ? <XCircle className="text-white shrink-0" size={26}/>
              : <AlertTriangle className="text-white shrink-0" size={26}/>}
            <p className="font-bold text-white text-base leading-tight">
              {resultado.metaCumplida ? 'Podés gastarlo sin problema'
                : resultado.enDeuda ? 'Te va a dejar en déficit'
                : 'Podés, pero perdés la meta del 5%'}
            </p>
          </div>

          {/* Stats */}
          <div className={`p-4 space-y-3 ${resultado.metaCumplida ? 'bg-emerald-50' : resultado.enDeuda ? 'bg-red-50' : 'bg-amber-50'}`}>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Balance actual" value={formatGsCompleto(resultado.balanceActual)} />
              <Stat label="Balance después" value={formatGsCompleto(resultado.balanceNuevo)} highlight={resultado.enDeuda} />
              <Stat label="Ahorro actual" value={`${resultado.pctActual.toFixed(1)}%`} />
              <Stat label="Ahorro después" value={`${resultado.pctNuevo.toFixed(1)}%`} highlight={resultado.pctNuevo < 5} />
            </div>

            {!resultado.metaCumplida && (
              <div className="bg-white/80 rounded-xl p-4 space-y-1.5 text-sm">
                <p className="font-semibold text-gray-700 mb-2">Alternativas</p>
                <p className="text-gray-600">• Dividir en 3 cuotas de <strong>{formatGsCompleto(resultado.cuotaEquiv)}/mes</strong></p>
                <p className="text-gray-600">• Esperar al mes que viene si el balance mejora</p>
                {resultado.enDeuda && <p className="text-gray-600">• Reducir otro gasto este mes primero</p>}
              </div>
            )}

            <button
              onClick={() => setResultado(null)}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1"
            >
              Simular otro monto
            </button>
          </div>
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
