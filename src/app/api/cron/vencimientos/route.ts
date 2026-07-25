import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Vercel Cron: configurar en vercel.json para ejecutar diariamente a las 8am
// En Fase 3: conectar Evolution API para enviar WhatsApp
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const hoy = new Date()
  const en7 = new Date(hoy); en7.setDate(hoy.getDate() + 7)
  const fmtDate = (d: Date) => d.toISOString().split('T')[0]

  const { data: vencimientos } = await db
    .from('gastos')
    .select('id, fecha_vencimiento, monto, conceptos(nombre), personas(nombre)')
    .gte('fecha_vencimiento', fmtDate(hoy))
    .lte('fecha_vencimiento', fmtDate(en7))
    .order('fecha_vencimiento', { ascending: true })

  if (!vencimientos || vencimientos.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0 })
  }

  // TODO Fase 3: enviar mensaje WhatsApp via Evolution API
  // const mensajes = vencimientos.map(v => `⚠️ Vence en ${diasRestantes(v.fecha_vencimiento)} días: ${v.conceptos?.nombre} — ${formatGs(v.monto)}`)
  // await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/...`, { ... })

  console.log('Vencimientos próximos (WhatsApp pendiente Fase 3):', vencimientos)

  return NextResponse.json({
    ok: true,
    vencimientos: vencimientos.length,
    // items para debug
    items: vencimientos.map((v: {
      fecha_vencimiento: string
      monto: number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conceptos: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      personas: any
    }) => ({ concepto: v.conceptos?.nombre, persona: v.personas?.nombre, vence: v.fecha_vencimiento, monto: v.monto })),
  })
}
