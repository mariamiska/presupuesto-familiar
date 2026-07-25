import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const PERSONAS_CONOCIDAS = ['Augusto', 'Miska', 'Niños', 'Casa', 'Familia']

function parsearMensaje(texto: string): { monto: number; concepto: string; persona: string } | null {
  const t = texto.toLowerCase().trim()
  const sinPrefijo = t.replace(/^(gast[eéo]|gasto|compré|compre)\s+/i, '')
  const montoMatch = sinPrefijo.match(/^(\d[\d.,]*)\s*(k|m|mil|millón|millon)?\b/)
  if (!montoMatch) return null

  let monto = parseFloat(montoMatch[1].replace(/\./g, '').replace(',', '.'))
  const sufijo = montoMatch[2]?.toLowerCase()
  if (sufijo === 'k' || sufijo === 'mil') monto *= 1000
  if (sufijo === 'm' || sufijo === 'millón' || sufijo === 'millon') monto *= 1_000_000
  monto = Math.round(monto)
  if (monto <= 0) return null

  const resto = sinPrefijo.slice(montoMatch[0].length).trim()
  const partes = resto.split(/\s+/).filter(Boolean)
  if (partes.length === 0) return null

  const persona = partes[partes.length - 1]
  const concepto = partes.slice(0, -1).join(' ') || persona
  return { monto, concepto, persona }
}

// Extrae monto, fecha y proveedor del texto crudo del OCR
function parsearTextoOcr(texto: string): { monto: number; concepto: string; persona: string; fecha: string } {
  const hoy = new Date().toISOString().split('T')[0]

  // Monto: buscar patrones como 150.000, 1.500.000, 50000, etc.
  const montoMatch = texto.match(/(?:total|monto|importe|gs\.?|₲)\s*[:\s]?\s*([\d.,]+)/i)
    || texto.match(/([\d]{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?)/g)?.slice(-1)
  let monto = 0
  if (montoMatch) {
    const raw = (Array.isArray(montoMatch) ? montoMatch[0] : montoMatch[1]).replace(/\./g, '').replace(',', '.')
    monto = Math.round(parseFloat(raw))
  }

  // Fecha: DD/MM/YYYY o YYYY-MM-DD
  const fechaMatch = texto.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/)
    || texto.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/)
  let fecha = hoy
  if (fechaMatch) {
    const [, a, b, c] = fechaMatch
    fecha = c.length === 4 ? `${c}-${b}-${a}` : `${a}-${b}-${c}`
  }

  // Proveedor: primera línea no vacía del texto
  const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 3)
  const concepto = lineas[0] || 'Comprobante'

  return { monto, concepto, persona: '', fecha }
}

async function analizarImagenConOcr(
  imageBase64: string,
  mimeType: string
): Promise<{ monto: number; concepto: string; persona: string; fecha: string } | null> {
  try {
    const formData = new FormData()
    formData.append('base64Image', `data:${mimeType};base64,${imageBase64}`)
    formData.append('language', 'spa')
    formData.append('isOverlayRequired', 'false')
    formData.append('detectOrientation', 'true')
    formData.append('scale', 'true')
    formData.append('OCREngine', '2')
    formData.append('apikey', process.env.OCR_SPACE_API_KEY!)

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()

    const texto = data?.ParsedResults?.[0]?.ParsedText
    if (!texto) return null

    const parsed = parsearTextoOcr(texto)
    if (parsed.monto <= 0) return null

    return parsed
  } catch {
    return null
  }
}

// Evolution API v2: descarga la imagen pasando el objeto message completo
async function descargarImagen(messageObj: object): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(
      `${process.env.EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/presupuesto-familiar`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.EVOLUTION_API_KEY!,
        },
        body: JSON.stringify({ message: messageObj, convertToMp4: false }),
      }
    )
    const data = await res.json()
    if (!data.base64) return null
    return { base64: data.base64, mimeType: data.mimetype || 'image/jpeg' }
  } catch {
    return null
  }
}

async function enviarRespuesta(numero: string, mensaje: string) {
  await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/presupuesto-familiar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.EVOLUTION_API_KEY!,
    },
    body: JSON.stringify({ number: numero, text: mensaje }),
  })
}

async function guardarGasto(params: {
  monto: number
  concepto: string
  personaNombre: string
  fecha: string
  nota: string
  numero: string
}) {
  const db = supabaseAdmin()
  const { data: personas } = await db.from('personas').select('id, nombre').eq('activa', true)

  const persona = personas?.find(
    (p) =>
      p.nombre.toLowerCase().includes(params.personaNombre.toLowerCase()) ||
      params.personaNombre.toLowerCase().includes(p.nombre.toLowerCase())
  )

  if (!persona) {
    const nombres = personas?.map((p) => p.nombre).join(', ')
    await enviarRespuesta(params.numero, `No encontré la persona "${params.personaNombre}". Personas disponibles: ${nombres}`)
    return false
  }

  let { data: concepto } = await db
    .from('conceptos')
    .select('id')
    .ilike('nombre', params.concepto)
    .eq('persona_id', persona.id)
    .single()

  if (!concepto) {
    const { data: nuevo } = await db
      .from('conceptos')
      .insert({ nombre: params.concepto, persona_id: persona.id, es_fijo: false })
      .select('id')
      .single()
    concepto = nuevo
  }

  if (!concepto) {
    await enviarRespuesta(params.numero, 'Error al crear el concepto. Intentá de nuevo.')
    return false
  }

  const { error } = await db.from('gastos').insert({
    fecha: params.fecha,
    concepto_id: concepto.id,
    persona_id: persona.id,
    monto: params.monto,
    nota: params.nota,
    fuente: 'whatsapp',
    pendiente_confirmacion: false,
  })

  if (error) {
    await enviarRespuesta(params.numero, 'Error al guardar el gasto. Intentá de nuevo.')
    return false
  }

  const montoFormateado = params.monto >= 1_000_000
    ? `₲ ${(params.monto / 1_000_000).toFixed(1)}M`
    : params.monto >= 1000
    ? `₲ ${(params.monto / 1000).toFixed(0)}K`
    : `₲ ${params.monto}`

  await enviarRespuesta(
    params.numero,
    `✅ Gasto registrado:\n*${montoFormateado}* — ${params.concepto}\nPersona: ${persona.nombre}\nFecha: ${params.fecha}`
  )
  return true
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Evolution API v2: el evento llega como body.event y el mensaje como body.data
    if (body.event !== 'messages.upsert') return NextResponse.json({ ok: true })

    const msg = body.data
    if (!msg) return NextResponse.json({ ok: true })

    // Ignorar mensajes propios y mensajes de grupos
    if (msg.key?.fromMe) return NextResponse.json({ ok: true })
    if (msg.key?.remoteJid?.endsWith('@g.us')) return NextResponse.json({ ok: true })

    const numero = msg.key?.remoteJid?.replace('@s.whatsapp.net', '')
    if (!numero) return NextResponse.json({ ok: true })

    const hoy = new Date().toISOString().split('T')[0]

    // --- Imagen / comprobante ---
    const imagenMsg = msg.message?.imageMessage || msg.message?.documentMessage
    if (imagenMsg) {
      await enviarRespuesta(numero, '📸 Analizando el comprobante con Gemini...')

      const imagen = await descargarImagen(msg)

      if (!imagen) {
        await enviarRespuesta(numero, 'No pude descargar la imagen. Intentá de nuevo.')
        return NextResponse.json({ ok: true })
      }

      const ocr = await analizarImagenConOcr(imagen.base64, imagen.mimeType)

      if (!ocr) {
        await enviarRespuesta(
          numero,
          'No pude leer el comprobante. ¿Podés escribir el monto manualmente?\nEjemplo: _50k supermercado miska_'
        )
        return NextResponse.json({ ok: true })
      }

      if (!ocr.persona) {
        await enviarRespuesta(
          numero,
          `📋 Comprobante leído:\n*₲ ${(ocr.monto / 1000).toFixed(0)}K* — ${ocr.concepto}\nFecha: ${ocr.fecha}\n\n¿A quién cargo este gasto?\n${PERSONAS_CONOCIDAS.join(' | ')}`
        )
        return NextResponse.json({ ok: true })
      }

      await guardarGasto({
        monto: ocr.monto,
        concepto: ocr.concepto,
        personaNombre: ocr.persona,
        fecha: ocr.fecha || hoy,
        nota: 'Comprobante vía WhatsApp',
        numero,
      })

      return NextResponse.json({ ok: true })
    }

    // --- Mensaje de texto ---
    const texto: string = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
    if (!texto) return NextResponse.json({ ok: true })

    const parsed = parsearMensaje(texto)
    if (!parsed) {
      await enviarRespuesta(
        numero,
        `No entendí ese formato 🤔\n\nProbá con:\n_50k supermercado miska_\n_gasto 150000 alquiler casa_\n\nO mandá una foto del comprobante 📸`
      )
      return NextResponse.json({ ok: true })
    }

    await guardarGasto({
      monto: parsed.monto,
      concepto: parsed.concepto,
      personaNombre: parsed.persona,
      fecha: hoy,
      nota: texto,
      numero,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
