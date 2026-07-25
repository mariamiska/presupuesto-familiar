import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function supabaseAdmin() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export type Persona = {
  id: string
  nombre: string
  color: string
  tipo: 'Persona' | 'Grupo'
  activa: boolean
}

export type Concepto = {
  id: string
  nombre: string
  persona_id: string
  es_fijo: boolean
  cuota_total?: number
  cuota_actual?: number
}

export type Gasto = {
  id: string
  fecha: string
  concepto_id: string
  persona_id: string
  monto: number
  nota?: string
  fuente: 'manual' | 'whatsapp' | 'ocr' | 'email'
  factura_url?: string
  pendiente_confirmacion: boolean
  registrado_por?: string
  created_at: string
  concepto?: Concepto
  persona?: Persona
}

export type Ingreso = {
  id: string
  mes: number
  anio: number
  concepto: string
  persona_id: string
  monto: number
}

export type Presupuesto = {
  id: string
  mes: number
  anio: number
  concepto_id: string
  monto_planificado: number
  notas?: string
}

export type Deuda = {
  id: string
  nombre: string
  tipo: 'prestamo' | 'tarjeta' | 'otra'
  persona_id: string
  capital_inicial?: number
  saldo_actual: number
  tasa_anual?: number
  cuota_mensual?: number
  cuotas_totales?: number
  cuotas_pagadas?: number
  fecha_vencimiento?: string
  activa: boolean
}

export const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'
]

export function mesNumero(nombre: string): number {
  return MESES.indexOf(nombre) + 1
}

export function formatGs(monto: number): string {
  return '₲ ' + monto.toLocaleString('es-PY', { maximumFractionDigits: 0 })
}
