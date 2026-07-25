// Datos reales extraídos del Excel — usados hasta que Supabase esté configurado

export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']

export const PERSONAS = [
  { nombre: 'Augusto', color: '#2980B9' },
  { nombre: 'Miska',   color: '#27AE60' },
  { nombre: 'Niños',   color: '#F39C12' },
  { nombre: 'Casa',    color: '#D35400' },
  { nombre: 'Familia', color: '#8E44AD' },
]

// Ingresos mensuales del Resumen Anual (₲)
export const INGRESOS_MES = [
  13349594, 14839594, 17810488, 17810488, 17810488, 17810488,
  17810488, 17810488, 17810488, 17810488, 17810488, 34410488,
]

// Gastos totales mensuales (planificado + real combinado)
export const GASTOS_MES = [
  14554594, 14599664, 21580683, 16199345, 0, 0,
  0, 0, 0, 0, 0, 0,
]

export const MES_ACTUAL = 7 // Julio 2026 (1-indexed)
export const ANIO_ACTUAL = 2026

export function formatGs(n: number) {
  if (n >= 1_000_000) return `₲ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₲ ${(n / 1_000).toFixed(0)}K`
  return `₲ ${n.toLocaleString('es-PY')}`
}

export function formatGsCompleto(n: number) {
  return '₲ ' + n.toLocaleString('es-PY', { maximumFractionDigits: 0 })
}

export function calcularAhorro(ingresos: number, gastos: number) {
  const balance = ingresos - gastos
  const pct = ingresos > 0 ? (balance / ingresos) * 100 : 0
  return { balance, pct }
}

export function semaforoColor(pct: number) {
  if (pct >= 5) return { bg: 'bg-emerald-500', text: 'text-emerald-700', label: '✓ Meta cumplida' }
  if (pct >= 0) return { bg: 'bg-amber-400',   text: 'text-amber-700',   label: '⚠ Cerca del límite' }
  return           { bg: 'bg-red-500',          text: 'text-red-700',     label: '✗ En déficit' }
}
