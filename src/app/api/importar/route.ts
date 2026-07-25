import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { supabaseAdmin } from '@/lib/supabase'

const MESES_MAP: Record<string, number> = {
  Enero:1, Febrero:2, Marzo:3, Abril:4, Mayo:5, Junio:6,
  Julio:7, Agosto:8, Setiembre:9, Septiembre:9, Octubre:10, Noviembre:11, Diciembre:12
}
const MES_COLS_IDX = [1,2,3,4,5,6,7,8,9,10,11,12] // columnas ENE-DIC en Resumen Anual
const ANIO = 2026

function personaDesdeConcepto(concepto: string): string {
  const c = concepto.toLowerCase()
  if (c.includes('augusto')) return 'Augusto'
  if (c.includes('miska')) return 'Miska'
  return 'Familia'
}

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const wb = XLSX.read(bytes, { type: 'buffer' })
    const db = supabaseAdmin()

    // 1. Cargar personas y conceptos existentes en memoria
    const { data: personasData } = await db.from('personas').select('id, nombre')
    const personaMap: Record<string, string> = {}
    personasData?.forEach(p => { personaMap[p.nombre.toLowerCase().trim()] = p.id })

    const { data: conceptosExistentes } = await db.from('conceptos').select('id, nombre, persona_id')
    const conceptoMap: Record<string, string> = {}
    conceptosExistentes?.forEach(c => { conceptoMap[`${c.persona_id}:${c.nombre.toLowerCase().trim()}`] = c.id })

    const getPersonaId = (nombre: string): string | null =>
      personaMap[nombre.toLowerCase().trim().replace('ñ','n')] ?? personaMap[nombre.toLowerCase().trim()] ?? null

    // Nuevos conceptos a crear en batch
    const nuevosConceptos: { nombre: string; persona_id: string; es_fijo: boolean }[] = []
    const pendingConceptoKeys = new Set<string>()

    const getOrQueueConcepto = (nombre: string, personaId: string): string | null => {
      const key = `${personaId}:${nombre.toLowerCase().trim()}`
      if (conceptoMap[key]) return conceptoMap[key]
      if (!pendingConceptoKeys.has(key)) {
        pendingConceptoKeys.add(key)
        nuevosConceptos.push({ nombre: nombre.trim(), persona_id: personaId, es_fijo: false })
      }
      return null // se resuelve después del batch insert
    }

    // 2. INGRESOS desde Resumen Anual
    const ingInserts: object[] = []
    const wsRes = wb.Sheets['Resumen Anual']
    if (wsRes) {
      const resumen = XLSX.utils.sheet_to_json<(string|number)[]>(wsRes, { header: 1, defval: '' })
      let inSection = false
      for (const row of resumen) {
        const v0 = String(row[0]).toUpperCase().trim()
        if (v0 === 'INGRESOS') { inSection = true; continue }
        if (v0 === 'SUBTOTAL' || v0.startsWith('GASTO')) { inSection = false; continue }
        if (!inSection || !row[0]) continue
        const concepto = String(row[0])
        const personaNombre = personaDesdeConcepto(concepto)
        const personaId = getPersonaId(personaNombre)
        MES_COLS_IDX.forEach((colIdx, mesIdx) => {
          const monto = Number(row[colIdx]) || 0
          if (monto > 0) ingInserts.push({ mes: mesIdx + 1, anio: ANIO, concepto, persona_id: personaId, monto })
        })
      }
    }

    // 3. PRE-SCAN Datos y Gastos Reales para descubrir todos los conceptos nuevos
    type RawRow = Record<string, string|number>
    const datosRows: RawRow[] = []           // todos los de Datos (para presupuesto)
    const datosGastRows: RawRow[] = []       // solo tipo=Gasto de Datos (para gastos reales)
    const realRows: RawRow[] = []            // Gastos Reales (para gastos reales)

    const wsDatos = wb.Sheets['Datos']
    if (wsDatos) {
      const rows = XLSX.utils.sheet_to_json<RawRow>(wsDatos, { range: 2, defval: '' })
      for (const row of rows) {
        const mesNombre = String(row['Mes'] ?? '').trim()
        const conceptoNombre = String(row['Concepto'] ?? '').trim()
        const personaNombre = String(row['Persona'] ?? '').trim()
        const monto = Number(row['Monto'] ?? 0)
        const tipo = String(row['Tipo'] ?? '').trim().toLowerCase()
        if (!MESES_MAP[mesNombre] || !conceptoNombre || !monto) continue
        const personaId = getPersonaId(personaNombre)
        if (!personaId) continue
        datosRows.push(row)
        getOrQueueConcepto(conceptoNombre, personaId)
        if (tipo === 'gasto') datosGastRows.push(row)
      }
    }

    const wsReal = wb.Sheets['Gastos Reales']
    if (wsReal) {
      const rows = XLSX.utils.sheet_to_json<RawRow>(wsReal, { range: 2, defval: '' })
      for (const row of rows) {
        const mesNombre = String(row['Mes'] ?? '').trim()
        const conceptoNombre = String(row['Concepto'] ?? '').trim()
        const personaNombre = String(row['Persona'] ?? '').trim().replace(/\s+/g,'')
        const monto = Number(row['Monto Real'] ?? 0)
        if (!MESES_MAP[mesNombre] || !conceptoNombre || !monto) continue
        const personaId = getPersonaId(personaNombre)
        if (!personaId) continue
        realRows.push(row)
        getOrQueueConcepto(conceptoNombre, personaId)
      }
    }

    // 4. Crear conceptos nuevos en un solo batch
    if (nuevosConceptos.length > 0) {
      const { data: creados } = await db.from('conceptos').insert(nuevosConceptos).select('id, nombre, persona_id')
      creados?.forEach(c => { conceptoMap[`${c.persona_id}:${c.nombre.toLowerCase().trim()}`] = c.id })
    }

    // 5. Construir inserts de presupuesto
    const presInserts: object[] = []
    for (const row of datosRows) {
      const mes = MESES_MAP[String(row['Mes']).trim()]
      const conceptoNombre = String(row['Concepto']).trim()
      const personaId = getPersonaId(String(row['Persona']).trim())!
      const monto = Number(row['Monto'])
      const conceptoId = conceptoMap[`${personaId}:${conceptoNombre.toLowerCase().trim()}`]
      if (conceptoId) presInserts.push({ mes, anio: ANIO, concepto_id: conceptoId, monto_planificado: monto })
    }

    // 6. Construir inserts de gastos reales
    const gastInserts: object[] = []

    // Gastos fijos de la hoja Datos (tipo=Gasto)
    for (const row of datosGastRows) {
      const mes = MESES_MAP[String(row['Mes']).trim()]
      const conceptoNombre = String(row['Concepto']).trim()
      const personaNombre = String(row['Persona']).trim()
      const personaId = getPersonaId(personaNombre)!
      const monto = Number(row['Monto'])
      const nota = String(row['Notas'] ?? '').trim()
      const conceptoId = conceptoMap[`${personaId}:${conceptoNombre.toLowerCase().trim()}`]
      if (conceptoId) {
        const fecha = `${ANIO}-${String(mes).padStart(2,'0')}-15`
        gastInserts.push({ fecha, concepto_id: conceptoId, persona_id: personaId, monto, nota, fuente: 'datos', pendiente_confirmacion: false })
      }
    }

    // Gastos variables de la hoja Gastos Reales
    for (const row of realRows) {
      const mes = MESES_MAP[String(row['Mes']).trim()]
      const conceptoNombre = String(row['Concepto']).trim()
      const personaNombre = String(row['Persona']).trim().replace(/\s+/g,'')
      const personaId = getPersonaId(personaNombre)!
      const monto = Number(row['Monto Real'])
      const nota = String(row['Nota'] ?? '').trim()
      const conceptoId = conceptoMap[`${personaId}:${conceptoNombre.toLowerCase().trim()}`]
      if (conceptoId) {
        const fecha = `${ANIO}-${String(mes).padStart(2,'0')}-15`
        gastInserts.push({ fecha, concepto_id: conceptoId, persona_id: personaId, monto, nota, fuente: 'importar', pendiente_confirmacion: false })
      }
    }

    // 7. Limpiar e insertar todo en batch
    await Promise.all([
      db.from('ingresos').delete().eq('anio', ANIO),
      db.from('presupuesto').delete().eq('anio', ANIO),
      db.from('gastos').delete().eq('fuente', 'importar'),
      db.from('gastos').delete().eq('fuente', 'datos'),
    ])

    await Promise.all([
      ingInserts.length ? db.from('ingresos').insert(ingInserts) : Promise.resolve(),
      presInserts.length ? db.from('presupuesto').insert(presInserts) : Promise.resolve(),
      gastInserts.length ? db.from('gastos').insert(gastInserts) : Promise.resolve(),
    ])

    return NextResponse.json({
      ok: true,
      ingresos: ingInserts.length,
      presupuesto: presInserts.length,
      gastos: gastInserts.length,
      conceptos: nuevosConceptos.length,
    })
  } catch (e: unknown) {
    console.error('Import error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
