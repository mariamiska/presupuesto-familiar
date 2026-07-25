import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const db = supabaseAdmin()

  const { data, error, count } = await db
    .from('gastos')
    .select('fecha, monto, fuente', { count: 'exact' })
    .limit(5)

  const { data: ing } = await db
    .from('ingresos')
    .select('mes, monto')
    .limit(3)

  return NextResponse.json({
    gastos: { data, error: error?.message, count },
    ingresos: ing,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-6),
  })
}
