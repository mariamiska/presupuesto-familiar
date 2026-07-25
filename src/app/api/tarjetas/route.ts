import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('tarjetas')
      .select('*, personas(nombre, color)')
      .eq('activa', true)
      .order('nombre', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, banco, persona_id, limite = 0, deuda_actual = 0 } = body

    if (!nombre || !banco) {
      return NextResponse.json({ error: 'Nombre y Banco son obligatorios' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const { data, error } = await db
      .from('tarjetas')
      .insert({
        nombre,
        banco,
        persona_id: persona_id || null,
        limite: parseInt(limite) || 0,
        deuda_actual: parseInt(deuda_actual) || 0,
        activa: true,
      })
      .select('*, personas(nombre, color)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}
