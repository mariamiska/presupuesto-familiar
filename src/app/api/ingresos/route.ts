import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const mes  = parseInt(req.nextUrl.searchParams.get('mes')  ?? '')
  const anio = parseInt(req.nextUrl.searchParams.get('anio') ?? '')
  if (!mes || !anio) return NextResponse.json({ total: 0, prestamos: 0 })

  // select('*') y no una lista de columnas: así no rompe si la migración
  // de es_prestamo todavía no corrió en esta base.
  const { data } = await supabaseAdmin()
    .from('ingresos')
    .select('*')
    .eq('mes', mes)
    .eq('anio', anio)

  // Un préstamo entra a la cuenta pero es deuda, no ingreso: va aparte.
  const filas = (data ?? []) as { monto: number; es_prestamo?: boolean | null }[]
  const total     = filas.filter(r => !r.es_prestamo).reduce((s, r) => s + r.monto, 0)
  const prestamos = filas.filter(r =>  r.es_prestamo).reduce((s, r) => s + r.monto, 0)

  return NextResponse.json({ total, prestamos })
}
