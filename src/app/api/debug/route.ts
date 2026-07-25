import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = supabaseAdmin()

  const { data: gastos7, error: err7 } = await db
    .from('gastos')
    .select('fecha, monto')
    .gte('fecha', '2026-07-01')
    .lte('fecha', '2026-07-31')

  const { count } = await db
    .from('gastos')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    totalGastos: count,
    gastosJulio: { count: gastos7?.length, error: err7?.message, sample: gastos7?.slice(0, 2) },
  })
}
