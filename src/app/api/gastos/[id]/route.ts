import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const db = supabaseAdmin()

    // Cancelar suscripción: eliminar gastos futuros del mismo grupo
    if (body.action === 'cancelar_suscripcion') {
      const { data: gasto } = await db
        .from('gastos')
        .select('suscripcion_id, fecha')
        .eq('id', params.id)
        .single()

      if (!gasto?.suscripcion_id) {
        return NextResponse.json({ error: 'Este gasto no pertenece a una suscripción' }, { status: 400 })
      }

      const hoy = new Date()
      const proximoMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 2).padStart(2, '0')}-01`

      await db
        .from('gastos')
        .delete()
        .eq('suscripcion_id', gasto.suscripcion_id)
        .gte('fecha', proximoMes)

      return NextResponse.json({ ok: true })
    }

    // Activar suscripción o fijo en un gasto existente
    if (body.tipo_recurrencia === 'suscripcion' || body.tipo_recurrencia === 'fijo') {
      const { data: gastoActual } = await db
        .from('gastos')
        .select('id, concepto_id, persona_id, monto, nota, fuente, fecha, suscripcion_id')
        .eq('id', params.id)
        .single()

      if (!gastoActual) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })

      // Si ya tiene suscripcion_id, solo actualizar los campos extras
      if (!gastoActual.suscripcion_id) {
        const anio = new Date(gastoActual.fecha + 'T12:00:00').getFullYear()
        const suscripcion_id = crypto.randomUUID()

        // Vincular gastos pasados del mismo concepto/persona en el mismo año
        const inicioAnio = `${anio}-01-01`
        const finAnio = `${anio}-12-31`

        await db
          .from('gastos')
          .update({ suscripcion_id, tipo_recurrencia: 'suscripcion' })
          .eq('concepto_id', gastoActual.concepto_id)
          .eq('persona_id', gastoActual.persona_id)
          .gte('fecha', inicioAnio)
          .lte('fecha', finAnio)
          .is('suscripcion_id', null)

        // Crear meses futuros que falten
        const [, mesActual, dia] = gastoActual.fecha.split('-').map(Number)
        const { data: gastosExistentes } = await db
          .from('gastos')
          .select('fecha')
          .eq('suscripcion_id', suscripcion_id)
          .gte('fecha', `${anio}-${String(mesActual).padStart(2, '0')}-01`)

        const mesesConGasto = new Set(
          (gastosExistentes ?? []).map(g => parseInt(g.fecha.split('-')[1]))
        )

        const gastosFuturos = []
        for (let mes = mesActual + 1; mes <= 12; mes++) {
          if (!mesesConGasto.has(mes)) {
            gastosFuturos.push({
              fecha: `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
              concepto_id: gastoActual.concepto_id,
              persona_id: gastoActual.persona_id,
              monto: gastoActual.monto,
              nota: gastoActual.nota ?? '',
              fuente: gastoActual.fuente,
              pendiente_confirmacion: false,
              tipo_recurrencia: body.tipo_recurrencia as 'suscripcion' | 'fijo',
              suscripcion_id,
            })
          }
        }

        if (gastosFuturos.length > 0) {
          await db.from('gastos').insert(gastosFuturos)
        }
      }
    }

    // Actualizar campos permitidos del gasto
    const { cuota_actual, cuotas_total, fecha_vencimiento, tipo_recurrencia } = body
    const { data, error } = await db
      .from('gastos')
      .update({ cuota_actual, cuotas_total, fecha_vencimiento, tipo_recurrencia })
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
