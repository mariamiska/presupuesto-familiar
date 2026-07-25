import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { supabaseAdmin } from '@/lib/supabase'

const MESES_MAP: Record<string, number> = {
  Enero:1, Febrero:2, Marzo:3, Abril:4, Mayo:5, Junio:6,
  Julio:7, Agosto:8, Setiembre:9, Septiembre:9, Octubre:10, Noviembre:11, Diciembre:12
}
const MES_COLS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SET','OCT','NOV','DIC']
const ANIO = 2026

function personaDesdeConcepto(concepto: string): string {
  const c = concepto.toLowerCase()
  if (c.includes('augusto')) return 'Augusto'
  if (c.includes('miska')) return 'Miska'
  return 'Familia'
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const wb = XLSX.read(bytes, { type: 'buffer' })
    const db = supabaseAdmin()

    // 1. Cargar personas existentes
    const { data: personasData } = await db.from('personas').select('id, nombre')
    const personaMap: Record<string, string> = {}
    personasData?.forEach(p => { personaMap[p.nombre.toLowerCase().trim()] = p.id })

    const getPersonaId = (nombre: string): string | null => {
      const key = nombre.toLowerCase().trim()
      return personaMap[key] ?? personaMap[key.replace('ñ','n')] ?? null
    }

    // 2. Cache de conceptos (buscar o crear)
    const conceptoCache: Record<string, string> = {}
    const getOrCreateConcepto = async (nombre: string, personaId: string): Promise<string> => {
      const key = `${personaId}:${nombre.toLowerCase().trim()}`
      if (conceptoCache[key]) return conceptoCache[key]
      const { data: existing } = await db.from('conceptos').select('id').ilike('nombre', nombre.trim()).eq('persona_id', personaId).single()
      if (existing) { conceptoCache[key] = existing.id; return existing.id }
      const { data: nuevo } = await db.from('conceptos').insert({ nombre: nombre.trim(), persona_id: personaId, es_fijo: false }).select('id').single()
      conceptoCache[key] = nuevo!.id
      return nuevo!.id
    }

    let totalIngresos = 0, totalPresupuesto = 0, totalGastos = 0

    // 3. INGRESOS desde Resumen Anual
    const wsRes = wb.Sheets['Resumen Anual']
    if (wsRes) {
      const resumen = XLSX.utils.sheet_to_json<string[]>(wsRes, { header: 1, defval: '' })
      let inIngSection = false
      const ingresosRows: { concepto: string; valores: number[] }[] = []
      for (const row of resumen) {
        const v0 = String(row[0]).toUpperCase().trim()
        if (v0 === 'INGRESOS') { inIngSection = true; continue }
        if (v0 === 'SUBTOTAL' || v0.startsWith('GASTO')) { inIngSection = false; continue }
        if (inIngSection && row[0]) {
          const vals = MES_COLS.map((_, i) => Number(row[i + 1]) || 0)
          ingresosRows.push({ concepto: String(row[0]), valores: vals })
        }
      }
      // Limpiar ingresos existentes para el año
      await db.from('ingresos').delete().eq('anio', ANIO)
      // Insertar por mes
      const ingInserts: object[] = []
      for (const { concepto, valores } of ingresosRows) {
        const personaNombre = personaDesdeConcepto(concepto)
        const personaId = getPersonaId(personaNombre)
        valores.forEach((monto, i) => {
          if (monto > 0) {
            ingInserts.push({ mes: i + 1, anio: ANIO, concepto, persona_id: personaId, monto })
            totalIngresos++
          }
        })
      }
      if (ingInserts.length) await db.from('ingresos').insert(ingInserts)
    }

    // 4. PRESUPUESTO PLANIFICADO desde hoja Datos
    const wsDatos = wb.Sheets['Datos']
    if (wsDatos) {
      const datos = XLSX.utils.sheet_to_json<Record<string,string|number>>(wsDatos, { range: 2, defval: '' })
      await db.from('presupuesto').delete().eq('anio', ANIO)
      const presInserts: object[] = []
      for (const row of datos) {
        const mesNombre = String(row['Mes'] ?? row['mes'] ?? '').trim()
        const conceptoNombre = String(row['Concepto'] ?? row['concepto'] ?? '').trim()
        const personaNombre = String(row['Persona'] ?? row['persona'] ?? '').trim()
        const monto = Number(row['Monto'] ?? row['monto'] ?? 0)
        const mes = MESES_MAP[mesNombre]
        if (!mes || !conceptoNombre || !personaNombre || !monto) continue
        const personaId = getPersonaId(personaNombre)
        if (!personaId) continue
        const conceptoId = await getOrCreateConcepto(conceptoNombre, personaId)
        presInserts.push({ mes, anio: ANIO, concepto_id: conceptoId, monto_planificado: monto })
        totalPresupuesto++
      }
      if (presInserts.length) await db.from('presupuesto').insert(presInserts)
    }

    // 5. GASTOS REALES desde hoja Gastos Reales
    const wsReal = wb.Sheets['Gastos Reales']
    if (wsReal) {
      const reales = XLSX.utils.sheet_to_json<Record<string,string|number>>(wsReal, { range: 2, defval: '' })
      await db.from('gastos').delete().eq('fuente', 'importar')
      const gastInserts: object[] = []
      for (const row of reales) {
        const mesNombre = String(row['Mes'] ?? row['mes'] ?? '').trim()
        const conceptoNombre = String(row['Concepto'] ?? row['concepto'] ?? '').trim()
        const personaNombre = String(row['Persona'] ?? row['persona'] ?? '').trim().replace(/\s+/g,'')
        const monto = Number(row['Monto Real'] ?? row['monto'] ?? 0)
        const nota = String(row['Nota'] ?? row['nota'] ?? '').trim()
        const mes = MESES_MAP[mesNombre]
        if (!mes || !conceptoNombre || !personaNombre || !monto) continue
        const personaId = getPersonaId(personaNombre)
        if (!personaId) continue
        const conceptoId = await getOrCreateConcepto(conceptoNombre, personaId)
        const fecha = `${ANIO}-${String(mes).padStart(2,'0')}-15`
        gastInserts.push({ fecha, concepto_id: conceptoId, persona_id: personaId, monto, nota, fuente: 'importar', pendiente_confirmacion: false })
        totalGastos++
      }
      if (gastInserts.length) await db.from('gastos').insert(gastInserts)
    }

    return NextResponse.json({ ok: true, ingresos: totalIngresos, presupuesto: totalPresupuesto, gastos: totalGastos })
  } catch (e: unknown) {
    console.error('Import error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
