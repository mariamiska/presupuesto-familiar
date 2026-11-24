import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Actualiza cuotas_pagadas en tabla deudas según gastos [cuota-deuda] con fecha <= hoy
export async function POST() {
  const db = supabaseAdmin()
  const hoy = new Date().toISOString().split('T')[0]

  // Gastos de cuota-deuda cuya fecha ya pasó
  const { data: gastos, error } = await db
    .from('gastos')
    .select('descripcion, cuota_num')
    .like('nota', '[cuota-deuda]%')
    .lte('fecha', hoy)
    .not('cuota_num', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // max cuota_num por descripcion = cuotas_pagadas actuales
  const maxPorNombre: Record<string, number> = {}
  for (const g of gastos ?? []) {
    if (!g.descripcion) continue
    const prev = maxPorNombre[g.descripcion] ?? 0
    if ((g.cuota_num ?? 0) > prev) maxPorNombre[g.descripcion] = g.cuota_num!
  }

  const { data: deudas } = await db
    .from('deudas')
    .select('id, nombre, cuotas_pagadas')
    .eq('activa', true)

  const updates = (deudas ?? [])
    .filter(d => maxPorNombre[d.nombre] !== undefined && maxPorNombre[d.nombre] > (d.cuotas_pagadas ?? 0))
    .map(d => db.from('deudas').update({ cuotas_pagadas: maxPorNombre[d.nombre] }).eq('id', d.id))

  await Promise.all(updates)

  return NextResponse.json({ ok: true, sincronizadas: updates.length })
}
