import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from('categorias')
    .select('id, nombre, icono, color')
    .order('orden')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export const dynamic = 'force-dynamic'
