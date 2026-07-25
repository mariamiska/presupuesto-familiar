import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Parsea mensajes como:
//   "gasté 50k supermercado miska"
//   "gasto 150000 alquiler casa"
//   "50k nafta augusto"
function parsearMensaje(texto: string): { monto: number; concepto: string; persona: string } | null {
  const t = texto.toLowerCase().trim()

  // Remover prefijos opcionales
  const sinPrefijo = t.replace(/^(gast[eéo]|gasto|compré|compre)\s+/i, '')

  // Extraer monto: 50k, 50.000, 50000, 1.5m
  const montoMatch = sinPrefijo.match(/^(\d[\d.,]*)\s*(k|m|mil|millón|millon)?\b/)
  if (!montoMatch) return null

  let monto = parseFloat(montoMatch[1].replace(/\./g, '').replace(',', '.'))
  const sufijo = montoMatch[2]?.toLowerCase()
  if (sufijo === 'k' || sufijo === 'mil') monto *= 1000
  if (sufijo === 'm' || sufijo === 'millón' || sufijo === 'millon') monto *= 1_000_000
  monto = Math.round(monto)

  if (monto <= 0) return null

  // El resto: "supermercado miska" — última palabra es la persona
  const resto = sinPrefijo.slice(montoMatch[0].length).trim()
  const partes = resto.split(/\s+/).filter(Boolean)

  if (partes.length === 0) return null

  const persona = partes[partes.length - 1]
  const concepto = partes.slice(0, -1).join(' ') || persona

  return { monto, concepto, persona }
}

async function enviarRespuesta(numero: string, mensaje: string) {
  const url = `${process.env.EVOLUTION_API_URL}/message/sendText/presupuesto-familiar`
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.EVOLUTION_API_KEY!,
    },
    body: JSON.stringify({
      number: numero,
      text: mensaje,
    }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Evolution API envía eventos de distintos tipos
    const evento = body.event
    if (evento !== 'messages.upsert') return NextResponse.json({ ok: true })

    const msg = body.data?.messages?.[0]
    if (!msg || msg.key?.fromMe) return NextResponse.json({ ok: true })

    const numero = msg.key?.remoteJid?.replace('@s.whatsapp.net', '')
    const texto: string = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''

    if (!texto) return NextResponse.json({ ok: true })

    const parsed = parsearMensaje(texto)

    if (!parsed) {
      await enviarRespuesta(
        numero,
        `No entendí ese formato. Probá con:\n_50k supermercado miska_\n_gasto 150000 alquiler casa_`
      )
      return NextResponse.json({ ok: true })
    }

    const db = supabaseAdmin()

    // Buscar persona (búsqueda flexible)
    const { data: personas } = await db.from('personas').select('id, nombre').eq('activa', true)
    const persona = personas?.find(
      (p) =>
        p.nombre.toLowerCase().includes(parsed.persona) ||
        parsed.persona.includes(p.nombre.toLowerCase())
    )

    if (!persona) {
      const nombres = personas?.map((p) => p.nombre).join(', ')
      await enviarRespuesta(numero, `No encontré la persona "${parsed.persona}". Personas disponibles: ${nombres}`)
      return NextResponse.json({ ok: true })
    }

    // Buscar o crear concepto
    let { data: concepto } = await db
      .from('conceptos')
      .select('id')
      .ilike('nombre', parsed.concepto)
      .eq('persona_id', persona.id)
      .single()

    if (!concepto) {
      const { data: nuevo } = await db
        .from('conceptos')
        .insert({ nombre: parsed.concepto, persona_id: persona.id, es_fijo: false })
        .select('id')
        .single()
      concepto = nuevo
    }

    if (!concepto) {
      await enviarRespuesta(numero, 'Error al crear el concepto. Intentá de nuevo.')
      return NextResponse.json({ ok: true })
    }

    const hoy = new Date().toISOString().split('T')[0]

    const { error } = await db.from('gastos').insert({
      fecha: hoy,
      concepto_id: concepto.id,
      persona_id: persona.id,
      monto: parsed.monto,
      nota: texto,
      fuente: 'whatsapp',
      pendiente_confirmacion: false,
    })

    if (error) {
      await enviarRespuesta(numero, 'Error al guardar el gasto. Intentá de nuevo.')
      return NextResponse.json({ ok: true })
    }

    const montoFormateado = parsed.monto >= 1000
      ? `₲ ${(parsed.monto / 1000).toFixed(0)}K`
      : `₲ ${parsed.monto}`

    await enviarRespuesta(
      numero,
      `✅ Gasto registrado:\n*${montoFormateado}* — ${parsed.concepto}\nPersona: ${persona.nombre}\nFecha: ${hoy}`
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
