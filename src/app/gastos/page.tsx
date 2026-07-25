'use client'
import { useState } from 'react'
import { Plus, CheckCircle } from 'lucide-react'
import { MESES, formatGsCompleto } from '@/lib/datos-demo'

const PERSONAS = ['Augusto','Miska','Niños','Casa','Familia']
const CONCEPTOS_POR_PERSONA: Record<string, string[]> = {
  Augusto: ['Préstamo Auto','Combustible','Telefonía','Seguro Auto','TC Crunchy','TC Spotify','Comercial','Ropa','Salud','Otro'],
  Miska:   ['Sueldo extra','Ropa','Salud','Belleza','Entretenimiento','Educación','Otro'],
  Niños:   ['Cantina','Escuela','Ropa','Útiles','Deporte','Actividades','Otro'],
  Casa:    ['Supermercado','Luz','Agua','Gas','Internet','Alquiler','Mantenimiento','Otro'],
  Familia: ['Salidas','Viajes','Regalos','Eventos','Otro'],
}

const GASTOS_DEMO = [
  { fecha: '2026-07-24', persona: 'Augusto', concepto: 'Transferencia', monto: 104000, nota: 'Gregorio Insfran', fuente: 'ocr' },
  { fecha: '2026-07-20', persona: 'Casa',    concepto: 'Supermercado',  monto: 450000, nota: '',              fuente: 'manual' },
  { fecha: '2026-07-18', persona: 'Niños',   concepto: 'Cantina',       monto: 23000,  nota: 'Sebas',         fuente: 'manual' },
]

const FUENTE_LABEL: Record<string, string> = { manual: '✏️ Manual', ocr: '📷 OCR', whatsapp: '💬 WhatsApp', email: '📧 Email' }

export default function GastosPage() {
  const [showForm, setShowForm] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [persona, setPersona] = useState('')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [nota, setNota] = useState('')
  const conceptos = persona ? (CONCEPTOS_POR_PERSONA[persona] || []) : []

  function guardar() {
    if (!monto || !persona || !concepto) return
    setGuardado(true)
    setTimeout(() => { setGuardado(false); setShowForm(false); setMonto(''); setNota('') }, 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gastos</h2>
          <p className="text-sm text-gray-500 mt-1">Historial y registro manual</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#2C3E50] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#34495E] transition-colors"
        >
          <Plus size={16}/> Nuevo gasto
        </button>
      </div>

      {/* Formulario rápido */}
      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100 space-y-4">
          <h3 className="font-semibold text-gray-700">Registrar gasto</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto (₲)</label>
              <input
                type="number"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="ej: 150000"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
              <select
                value={persona}
                onChange={e => { setPersona(e.target.value); setConcepto('') }}
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
                disabled={!persona}
              >
                <option value="">Seleccioná</option>
                {conceptos.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
              <input
                type="text"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Descripción breve"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          {guardado ? (
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <CheckCircle size={18}/> ¡Guardado!
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={guardar}
                disabled={!monto || !persona || !concepto}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40"
              >
                Guardar
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-700">Últimos gastos</h3>
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
            {MESES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="divide-y divide-gray-50">
          {GASTOS_DEMO.map((g, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{g.concepto}</span>
                  <span className="text-xs text-gray-400">{FUENTE_LABEL[g.fuente]}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {g.persona} · {new Date(g.fecha).toLocaleDateString('es-PY')}
                  {g.nota && ` · ${g.nota}`}
                </p>
              </div>
              <span className="font-bold text-gray-800">{formatGsCompleto(g.monto)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
