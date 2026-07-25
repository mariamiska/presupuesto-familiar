import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PERSONAS = ['Augusto', 'Miska', 'Niños', 'Casa', 'Familia']

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File
    if (!file) return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    const prompt = `Sos un asistente de finanzas personales para una familia paraguaya. Analizá este comprobante (ticket, factura o transferencia bancaria) y extraé los datos en JSON.

Personas posibles: ${PERSONAS.join(', ')}.
Si el titular es "Augusto Nicolas Servin Pappalardo" → persona = "Augusto".
Si el titular es "Miska" o nombre femenino → persona = "Miska".
Si no podés determinar → persona = "".

Respondé SOLO con JSON válido, sin texto adicional:
{
  "monto": número en guaraníes (sin puntos ni comas),
  "proveedor": "nombre del proveedor o beneficiario",
  "fecha": "YYYY-MM-DD",
  "tipo": "transferencia" | "compra" | "pago_servicio" | "otro",
  "persona_sugerida": "Augusto" | "Miska" | "Niños" | "Casa" | "Familia" | "",
  "concepto_sugerido": categoría sugerida en español,
  "referencia": "número de operación o referencia si existe"
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt }
        ]
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No se pudo extraer JSON de la respuesta')
    const data = JSON.parse(jsonMatch[0])

    return NextResponse.json(data)
  } catch (e: unknown) {
    console.error('OCR error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
