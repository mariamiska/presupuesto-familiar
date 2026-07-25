import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const personaId = searchParams.get('persona_id')
  const db = supabaseAdmin()
  let query = db.from('conceptos').select('id, nombre, persona_id').order('nombre')
  if (personaId) query = query.eq('persona_id', personaId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
