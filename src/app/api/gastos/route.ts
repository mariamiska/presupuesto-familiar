import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mes = searchParams.get('mes')
  const anio = searchParams.get('anio') ?? new Date().getFullYear().toString()

  const db = supabaseAdmin()
  const recurrentes = searchParams.get('recurrentes')

  let query = db
    .from('gastos')
    .select('*, personas(nombre, color), conceptos(nombre)')
    .order('fecha', { ascending: false })

  if (recurrentes === '1') {
    query = query.not('tipo_recurrencia', 'is', null)
  } else if (mes) {
    const m = parseInt(mes)
    const a = parseInt(anio)
    const inicio = `${a}-${String(m).padStart(2,'0')}-01`
    const fin = `${a}-${String(m).padStart(2,'0')}-31`
    query = query.gte('fecha', inicio).lte('fecha', fin)
  }

  const { data, error } = await query.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fecha, persona_nombre, concepto_nombre, monto, nota, fuente = 'manual', tipo_recurrencia } = body

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

    const fechaBase = fecha ?? new Date().toISOString().split('T')[0]

    if (tipo_recurrencia === 'suscripcion' || tipo_recurrencia === 'fijo') {
      const gastos = crearGastosRecurrentes({
        fechaBase,
        concepto_id: concepto.id,
        persona_id: persona.id,
        monto: parseInt(monto),
        nota: nota ?? '',
        fuente,
        tipo_recurrencia,
      })

      const { data, error } = await db.from('gastos').insert(gastos).select().order('fecha', { ascending: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data[0])
    }

    const { data, error } = await db
      .from('gastos')
      .insert({
        fecha: fechaBase,
        concepto_id: concepto.id,
        persona_id: persona.id,
        monto: parseInt(monto),
        nota: nota ?? '',
        fuente,
        pendiente_confirmacion: false,
        tipo_recurrencia: tipo_recurrencia ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}

function crearGastosRecurrentes({
  fechaBase,
  concepto_id,
  persona_id,
  monto,
  nota,
  fuente,
  tipo_recurrencia,
}: {
  fechaBase: string
  concepto_id: string
  persona_id: string
  monto: number
  nota: string
  fuente: string
  tipo_recurrencia: 'suscripcion' | 'fijo'
}) {
  const suscripcion_id = crypto.randomUUID()
  const [anio, mesInicio, dia] = fechaBase.split('-').map(Number)
  const gastos = []

  for (let mes = mesInicio; mes <= 12; mes++) {
    gastos.push({
      fecha: `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
      concepto_id,
      persona_id,
      monto,
      nota,
      fuente,
      pendiente_confirmacion: false,
      tipo_recurrencia,
      suscripcion_id,
    })
  }

  return gastos
}
