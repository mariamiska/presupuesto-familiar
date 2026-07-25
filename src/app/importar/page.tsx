'use client'
import { useState, useRef } from 'react'
import { FileSpreadsheet, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

type ImportResult = {
  ok: boolean
  ingresos: number
  presupuesto: number
  gastos: number
  conceptos: number
}

export default function ImportarPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function importar() {
    if (!archivo) return
    setCargando(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', archivo)
      const res = await fetch('/api/importar', { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResultado(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al importar')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Importar desde Excel</h2>
        <p className="text-sm text-gray-500 mt-1">Cargá tu archivo Presupuesto 2026.xlsx para migrar los datos</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1">
        <p className="font-semibold">¿Qué se importa?</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700">
          <li>Hoja <strong>Datos</strong>: presupuesto planificado por mes/concepto/persona</li>
          <li>Hoja <strong>Gastos Reales</strong>: gastos registrados hasta hoy</li>
          <li>Hoja <strong>Configuracion</strong>: personas y conceptos</li>
        </ul>
        <p className="text-amber-600 text-xs mt-2">Los datos existentes no se borran — solo se agregan los nuevos.</p>
      </div>

      {!resultado ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
          >
            <FileSpreadsheet className="mx-auto mb-3 text-gray-300" size={36}/>
            {archivo ? (
              <div>
                <p className="font-medium text-gray-700">{archivo.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(archivo.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-gray-500">Seleccioná el archivo .xlsx</p>
                <p className="text-xs text-gray-400 mt-1">Presupuesto 2026.xlsx</p>
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => e.target.files?.[0] && setArchivo(e.target.files[0])}
          />
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
              <AlertCircle size={15}/>{error}
            </div>
          )}
          <button
            onClick={importar}
            disabled={!archivo || cargando}
            className="w-full bg-[#2C3E50] text-white py-3 rounded-lg font-semibold hover:bg-[#34495E] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {cargando ? <><Loader2 className="animate-spin" size={16}/>Importando…</> : 'Importar datos'}
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-lg">
            <CheckCircle size={24}/> Importación completada
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Registros de ingresos" value={resultado.ingresos}/>
            <Stat label="Filas de presupuesto" value={resultado.presupuesto}/>
            <Stat label="Gastos reales" value={resultado.gastos}/>
            <Stat label="Conceptos nuevos" value={resultado.conceptos}/>
          </div>
          <a href="/" className="block text-center text-emerald-700 underline text-sm">
            Ver dashboard →
          </a>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/70 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-bold text-xl text-gray-800">{value}</p>
    </div>
  )
}
