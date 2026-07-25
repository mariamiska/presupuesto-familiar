import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('gastos')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { persona_nombre, concepto_nombre, monto, fecha, nota } = body
    const db = supabaseAdmin()

    const { data: persona } = await db
      .from('personas')
      .select('id')
      .ilike('nombre', persona_nombre)
      .single()
    if (!persona) return NextResponse.json({ error: `Persona "${persona_nombre}" no encontrada` }, { status: 400 })

    let { data: concepto } = await db
      .from('conceptos')
      .select('id')
      .ilike('nombre', concepto_nombre)
      .eq('persona_id', persona.id)
      .single()
    if (!concepto) {
      const { data: nuevo } = await db
        .from('conceptos')
        .insert({ nombre: concepto_nombre, persona_id: persona.id, es_fijo: false })
        .select('id')
        .single()
      concepto = nuevo
    }
    if (!concepto) return NextResponse.json({ error: 'No se pudo crear el concepto' }, { status: 500 })

    const { data, error } = await db
      .from('gastos')
      .update({ persona_id: persona.id, concepto_id: concepto.id, monto: parseInt(monto), fecha, nota: nota ?? '' })
      .eq('id', params.id)
      .select('*, personas(nombre, color), conceptos(nombre)')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = supabaseAdmin()
  const { error } = await db.from('gastos').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
