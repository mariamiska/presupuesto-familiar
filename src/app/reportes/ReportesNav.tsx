'use client'
import { useRouter } from 'next/navigation'

export default function ReportesNav({ anioActual, anios }: { anioActual: number; anios: number[] }) {
  const router = useRouter()
  return (
    <select
      value={anioActual}
      onChange={e => router.push(`/reportes?anio=${e.target.value}`)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none bg-white font-semibold text-gray-700"
    >
      {anios.map(a => <option key={a} value={a}>{a}</option>)}
    </select>
  )
}
