import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const MESES_MAP: Record<string, number> = {
  Enero:1, Febrero:2, Marzo:3, Abril:4, Mayo:5, Junio:6,
  Julio:7, Agosto:8, Setiembre:9, Octubre:10, Noviembre:11, Diciembre:12
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const wb = XLSX.read(bytes, { type: 'buffer' })

    // Hoja Datos → presupuesto planificado
    const wsDatos = wb.Sheets['Datos']
    const datos = XLSX.utils.sheet_to_json<Record<string,string>>(wsDatos, { header: ['mes','concepto','persona','tipo','monto','cuota','notas'], range: 3 })

    // Hoja Gastos Reales
    const wsReal = wb.Sheets['Gastos Reales']
    const reales = XLSX.utils.sheet_to_json<Record<string,string>>(wsReal, { header: ['mes','concepto','persona','monto','nota'], range: 3 })

    // Hoja Resumen para ingresos
    const wsRes = wb.Sheets['Resumen Anual']
    const resumen = XLSX.utils.sheet_to_json<Record<string,unknown>>(wsRes, { range: 2 })

    // Conteo para respuesta
    const planificado = datos.filter(r => r.mes && r.concepto).length
    const gastosReales = reales.filter(r => r.mes && r.concepto).length

    // Conceptos únicos
    const conceptosSet = new Set<string>()
    datos.forEach(r => r.concepto && conceptosSet.add(r.concepto))
    reales.forEach(r => r.concepto && conceptosSet.add(r.concepto))

    // Ingresos del resumen (primeras filas hasta SUBTOTAL)
    let ingresos = 0
    for (const row of resumen) {
      const vals = Object.values(row)
      if (String(vals[0]).toUpperCase() === 'SUBTOTAL') break
      if (String(vals[0]).toUpperCase() === 'INGRESOS') continue
      ingresos++
    }

    // En producción aquí harías los INSERTs en Supabase.
    // Por ahora devolvemos el conteo para mostrar en UI.
    return NextResponse.json({
      conceptos: conceptosSet.size,
      presupuesto: planificado,
      gastos_reales: gastosReales,
      ingresos,
      datos: datos.slice(0, 5),  // muestra preview en consola
    })
  } catch (e: unknown) {
    console.error('Import error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
