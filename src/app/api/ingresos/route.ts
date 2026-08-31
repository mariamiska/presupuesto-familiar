import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const mes  = parseInt(req.nextUrl.searchParams.get('mes')  ?? '')
  const anio = parseInt(req.nextUrl.searchParams.get('anio') ?? '')
  if (!mes || !anio) return NextResponse.json({ total: 0 })

  const { data } = await supabaseAdmin()
    .from('ingresos')
    .select('monto')
    .eq('mes', mes)
    .eq('anio', anio)

  const total = data?.reduce((s, r) => s + r.monto, 0) ?? 0
  return NextResponse.json({ total })
}
