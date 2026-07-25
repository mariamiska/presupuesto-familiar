import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const PERSONAS = ['Augusto', 'Miska', 'Niños', 'Casa', 'Familia']

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File
    if (!file) return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = (file.type || 'image/jpeg') as string

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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      prompt,
    ])

    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No se pudo extraer JSON de la respuesta')
    const data = JSON.parse(jsonMatch[0])

    return NextResponse.json(data)
  } catch (e: unknown) {
    console.error('OCR error:', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
