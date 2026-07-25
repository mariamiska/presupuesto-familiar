import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { nombre, banco, persona_id, limite, deuda_actual } = body

    const db = supabaseAdmin()
    const { data, error } = await db
      .from('tarjetas')
      .update({
        nombre,
        banco,
        persona_id: persona_id || null,
        limite: limite !== undefined ? parseInt(limite) : undefined,
        deuda_actual: deuda_actual !== undefined ? parseInt(deuda_actual) : undefined,
      })
      .eq('id', id)
      .select('*, personas(nombre, color)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const db = supabaseAdmin()
    // Soft delete (desactivar)
    const { error } = await db
      .from('tarjetas')
      .update({ activa: false })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}
