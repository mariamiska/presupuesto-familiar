import { NextRequest, NextResponse } from 'next/server'
// Importamos la lib interna para evitar el bug de module.parent en Next.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js')

// Convierte "20/01/2024" → "2024-01-20"
function parseFecha(s: string): string {
  const [d, m, y] = s.split('/')
  return `${y}-${m}-${d}`
}

// Convierte "1.218.975" → 1218975
function parseNum(s: string): number {
  return parseInt(s.replace(/\./g, '').replace(',', '.')) || 0
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const { text } = await pdfParse(buffer)

    // Extraer cabecera
    // El texto del PDF viene pegado, los campos de cabecera también
    const tanMatch = text.match(/[\n\r]([\d,]+)\s*%[\n\r]/) || text.match(/T\.A\.N\.[^\d]*([\d,]+)\s*%/)
    const tasaAnual = tanMatch ? parseFloat(tanMatch[1].replace(',', '.')) : null

    const nroMatch = text.match(/(\d{9})Nro Préstamo:/) || text.match(/Nro Préstamo:\s*(\d+)/)
    const nroPrestamo = nroMatch?.[1] ?? null

    const clienteMatch = text.match(/Cliente:([\s\S]*?)Documento:/)
    const cliente = clienteMatch?.[1]?.trim() ?? null

    // Extraer filas de la tabla de cuotas
    // El PDF exporta cada fila sin separadores, todo pegado:
    // "120/01/2024121.09602.429.9381.218.9751.210.963312.551.034"
    // Los montos usan formato paraguayo X.XXX o X.XXX.XXX (grupos de 3 con punto)
    // Seguros siempre es 0 → ancla el patrón
    const MONTO = /\d{1,3}(?:\.\d{3})*/
    const filaRegex = new RegExp(
      `^(\\d{1,3})(\\d{2}\\/\\d{2}\\/\\d{4})(${MONTO.source})0(${MONTO.source})(${MONTO.source})(${MONTO.source})(\\d{2,3})(${MONTO.source})$`,
      'gm'
    )
    const cuotas: Array<{ numero: number; vencimiento: string; capital: number; interes: number; monto: number }> = []

    let m: RegExpExecArray | null
    while ((m = filaRegex.exec(text)) !== null) {
      cuotas.push({
        numero: parseInt(m[1]),
        vencimiento: parseFecha(m[2]),
        capital: parseNum(m[5]),  // capital es grupo 5
        interes: parseNum(m[6]),  // interes es grupo 6
        monto: parseNum(m[8]),    // monto total es grupo 8
      })
    }

    if (cuotas.length === 0) {
      return NextResponse.json({ error: 'No se pudo leer la tabla de cuotas del PDF' }, { status: 422 })
    }

    // Calcular cuotas pagadas y saldo basado en fecha de hoy
    const hoy = new Date()
    hoy.setHours(12, 0, 0, 0)

    const pagadas = cuotas.filter(c => new Date(c.vencimiento + 'T12:00:00') <= hoy)
    const pendientes = cuotas.filter(c => new Date(c.vencimiento + 'T12:00:00') > hoy)

    const saldoActual = pendientes.reduce((s, c) => s + c.capital, 0)
    const cuotaMensualBase = cuotas
      .map(c => c.monto)
      .sort((a, b) => cuotas.filter(x => x.monto === a).length - cuotas.filter(x => x.monto === b).length)
      .pop() ?? cuotas[0]?.monto

    // Cuota mensual más frecuente (ignorando cuotas especiales anuales)
    const montos = cuotas.map(c => c.monto)
    const frecuencia: Record<number, number> = {}
    for (const m of montos) frecuencia[m] = (frecuencia[m] ?? 0) + 1
    const cuotaBase = Object.entries(frecuencia).sort((a, b) => b[1] - a[1])[0]
    const cuotaMensual = parseInt(cuotaBase?.[0] ?? String(cuotaMensualBase))

    const proximaCuota = pendientes[0] ?? null

    return NextResponse.json({
      nro_prestamo: nroPrestamo,
      cliente,
      tasa_anual: tasaAnual,
      cuotas_totales: cuotas.length,
      cuotas_pagadas: pagadas.length,
      cuota_mensual: cuotaMensual,
      saldo_actual: Math.round(saldoActual),
      fecha_vencimiento: cuotas[cuotas.length - 1]?.vencimiento ?? null,
      proxima_cuota: proximaCuota
        ? { numero: proximaCuota.numero, vencimiento: proximaCuota.vencimiento, monto: proximaCuota.monto }
        : null,
    })
  } catch (e: unknown) {
    console.error(e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al procesar el PDF' }, { status: 500 })
  }
}
