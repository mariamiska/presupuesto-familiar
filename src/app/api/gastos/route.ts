import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mes = searchParams.get('mes')
  const anio = searchParams.get('anio') ?? new Date().getFullYear().toString()
  const recurrentes = searchParams.get('recurrentes')

  const db = supabaseAdmin()
  let query = db
    .from('gastos')
    .select('*, personas(nombre, color), categorias(nombre, color, icono), tarjetas(id, nombre, banco)')
    .order('fecha', { ascending: false })

  if (recurrentes === '1') {
    query = query.not('tipo_recurrencia', 'is', null)
  } else if (mes) {
    const m = parseInt(mes)
    const a = parseInt(anio)
    const ultimoDiaMes = new Date(a, m, 0).getDate()
    const inicio = `${a}-${String(m).padStart(2,'0')}-01`
    const fin = `${a}-${String(m).padStart(2,'0')}-${String(ultimoDiaMes).padStart(2,'0')}`
    query = query.gte('fecha', inicio).lte('fecha', fin)
  }

  const { data, error } = await query.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fecha, persona_nombre, descripcion, categoria_id, tarjeta_id, monto, nota, fuente = 'manual', tipo_recurrencia } = body

    const db = supabaseAdmin()

    const { data: persona } = await db
      .from('personas')
      .select('id')
      .ilike('nombre', persona_nombre)
      .single()

    if (!persona) return NextResponse.json({ error: `Persona "${persona_nombre}" no encontrada` }, { status: 400 })

    const fechaBase = fecha ?? new Date().toISOString().split('T')[0]
    const montoNum = parseInt(monto)

    if (tipo_recurrencia === 'suscripcion' || tipo_recurrencia === 'fijo') {
      const gastos = crearGastosRecurrentes({
        fechaBase,
        persona_id: persona.id,
        descripcion: descripcion ?? '',
        categoria_id,
        tarjeta_id: tarjeta_id || null,
        monto: montoNum,
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
        descripcion: descripcion ?? '',
        categoria_id,
        tarjeta_id: tarjeta_id || null,
        persona_id: persona.id,
        monto: montoNum,
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
  fechaBase, persona_id, descripcion, categoria_id, tarjeta_id, monto, nota, fuente, tipo_recurrencia,
}: {
  fechaBase: string
  persona_id: string
  descripcion: string
  categoria_id: string
  tarjeta_id?: string | null
  monto: number
  nota: string
  fuente: string
  tipo_recurrencia: 'suscripcion' | 'fijo'
}) {
  const suscripcion_id = crypto.randomUUID()
  const [anio, mesInicio, dia] = fechaBase.split('-').map(Number)

  return Array.from({ length: 13 - mesInicio }, (_, i) => ({
    fecha: `${anio}-${String(mesInicio + i).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
    descripcion,
    categoria_id,
    tarjeta_id: tarjeta_id || null,
    persona_id,
    monto,
    nota,
    fuente,
    pendiente_confirmacion: false,
    tipo_recurrencia,
    suscripcion_id,
  }))
}
