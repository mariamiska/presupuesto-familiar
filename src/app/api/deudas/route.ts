import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const db = supabaseAdmin()

  // Deudas explícitas de la tabla deudas
  const { data: deudas, error: errDeudas } = await db
    .from('deudas')
    .select('*, personas(nombre, color)')
    .eq('activa', true)
    .order('saldo_actual', { ascending: false })
  if (errDeudas) return NextResponse.json({ error: errDeudas.message }, { status: 500 })

  // Gastos con cuota — traemos todos y agrupamos por concepto_id en JS
  const { data: gastosConCuota, error: errGastos } = await db
    .from('gastos')
    .select('id, concepto_id, persona_id, monto, cuota_actual, cuotas_total, fecha_vencimiento, fecha, conceptos(nombre), personas(nombre, color)')
    .not('cuotas_total', 'is', null)
    .order('fecha', { ascending: false })

  if (errGastos) return NextResponse.json({ error: errGastos.message }, { status: 500 })

  // Tomar el gasto más reciente por concepto_id (ya vienen ordenados por fecha desc)
  const vistos = new Set<string>()
  const gastosDeuda = (gastosConCuota ?? [])
    .filter(g => {
      if (vistos.has(g.concepto_id)) return false
      vistos.add(g.concepto_id)
      return true
    })
    .map(g => ({
      id: `gasto-${g.concepto_id}`,
      nombre: (g.conceptos as unknown as { nombre: string } | null)?.nombre ?? '—',
      tipo: 'prestamo' as const,
      persona_id: g.persona_id,
      personas: g.personas as unknown as { nombre: string; color: string } | null,
      saldo_actual: g.monto * ((g.cuotas_total ?? 0) - (g.cuota_actual ?? 0)),
      cuota_mensual: g.monto,
      cuotas_totales: g.cuotas_total,
      cuotas_pagadas: g.cuota_actual,
      fecha_vencimiento: g.fecha_vencimiento,
      activa: true,
      fuente: 'gasto' as const,
    }))

  // Unir: primero deudas explícitas, luego las derivadas de gastos
  // (excluir gastos cuyo concepto ya tenga una deuda explícita con mismo nombre)
  const nombresDeudas = new Set((deudas ?? []).map(d => d.nombre.toLowerCase()))
  const gastosNoDuplicados = gastosDeuda.filter(g => !nombresDeudas.has(g.nombre.toLowerCase()))

  return NextResponse.json([
    ...(deudas ?? []).map(d => ({ ...d, fuente: 'deuda' })),
    ...gastosNoDuplicados,
  ])
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { persona_nombre, _skip_persona_lookup, ...rest } = body
    const db = supabaseAdmin()

    let persona_id = rest.persona_id
    if (!_skip_persona_lookup) {
      const { data: persona } = await db
        .from('personas')
        .select('id')
        .ilike('nombre', persona_nombre)
        .single()
      if (!persona) return NextResponse.json({ error: `Persona "${persona_nombre}" no encontrada` }, { status: 400 })
      persona_id = persona.id
    }

    const { data, error } = await db
      .from('deudas')
      .insert({ ...rest, persona_id, activa: true })
      .select('*, personas(nombre, color)')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}
