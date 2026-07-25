import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { supabaseAdmin } from '@/lib/supabase'

const MESES_MAP: Record<string, number> = {
  Enero:1, Febrero:2, Marzo:3, Abril:4, Mayo:5, Junio:6,
  Julio:7, Agosto:8, Setiembre:9, Septiembre:9, Octubre:10, Noviembre:11, Diciembre:12
}
const MES_COLS_IDX = [1,2,3,4,5,6,7,8,9,10,11,12]
const ANIO = 2026

function personaDesdeConcepto(concepto: string): string {
  const c = concepto.toLowerCase()
  if (c.includes('augusto')) return 'Augusto'
  if (c.includes('miska')) return 'Miska'
  return 'Familia'
}

// Mapeo de palabras clave → nombre de categoría
const KEYWORD_CATEGORIA: Array<{ keywords: string[]; categoria: string }> = [
  { keywords: ['agua','bebedero','comida','súper','super','cantina','chilui','comercial'], categoria: 'Alimentación' },
  { keywords: ['expensas','basura','limpieza','ferretería','ferreteria','luz casa'], categoria: 'Vivienda' },
  { keywords: ['auto','combus','combustible','mantenimiento camio','seguro auto'], categoria: 'Transporte' },
  { keywords: ['claro','celu','internet','telefonía','telefonia','apple','google','microsoft','star','mango','netflix','spotify','ytoro','crunchy'], categoria: 'Servicios' },
  { keywords: ['farmacia','seguro médico','seguro medico','seguro niño','seguro nino','frenillo','estudios pre'], categoria: 'Salud' },
  { keywords: ['anualidad','libros','carpeta','profe particular','universitaria'], categoria: 'Escuela' },
  { keywords: ['blanqui','botines','canilleras','champion','equipo niños','equipo ninos','equipo práctica','equipo practica','fútbol','futbol','partido'], categoria: 'Fútbol Niños' },
  { keywords: ['tatakae'], categoria: 'Entretenimiento' },
  { keywords: ['pijama','ropa'], categoria: 'Ropa' },
  { keywords: ['crediagil','fpj','gnb','tc gnb','iphone','mac','tarjeta','ueno','prestamo','préstamo','crédito universitaria','credito universitaria'], categoria: 'Deudas' },
  { keywords: ['baby shower','cumple','madre','maestro','regalo','viaje mamá','viaje mama','unicentro'], categoria: 'Regalos' },
]

function inferirCategoriaId(nombreConcepto: string, categoriaMap: Record<string, string>): string {
  const n = nombreConcepto.toLowerCase()
  for (const { keywords, categoria } of KEYWORD_CATEGORIA) {
    if (keywords.some(kw => n.includes(kw))) {
      return categoriaMap[categoria] ?? categoriaMap['Otro']
    }
  }
  return categoriaMap['Otro']
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

    // 1. Cargar personas y categorias en memoria
    const [{ data: personasData }, { data: categoriasData }] = await Promise.all([
      db.from('personas').select('id, nombre'),
      db.from('categorias').select('id, nombre'),
    ])

    const personaMap: Record<string, string> = {}
    personasData?.forEach(p => { personaMap[p.nombre.toLowerCase().trim()] = p.id })

    const categoriaMap: Record<string, string> = {}
    categoriasData?.forEach(c => { categoriaMap[c.nombre] = c.id })

    const getPersonaId = (nombre: string): string | null =>
      personaMap[nombre.toLowerCase().trim().replace('ñ','n')] ?? personaMap[nombre.toLowerCase().trim()] ?? null

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
        const personaId = getPersonaId(personaDesdeConcepto(concepto))
        MES_COLS_IDX.forEach((colIdx, mesIdx) => {
          const monto = Number(row[colIdx]) || 0
          if (monto > 0) ingInserts.push({ mes: mesIdx + 1, anio: ANIO, concepto, persona_id: personaId, monto })
        })
      }
    }

    // 3. Escanear hojas Datos y Gastos Reales
    type RawRow = Record<string, string|number>
    const datosRows: RawRow[] = []
    const datosGastRows: RawRow[] = []
    const realRows: RawRow[] = []

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
        if (!getPersonaId(personaNombre)) continue
        datosRows.push(row)
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
        if (!getPersonaId(personaNombre)) continue
        realRows.push(row)
      }
    }

    // 4. Construir inserts de presupuesto (agrupado por categoria+mes)
    const presBucket: Record<string, number> = {} // key: `${mes}:${categoria_id}`
    for (const row of datosRows) {
      const mes = MESES_MAP[String(row['Mes']).trim()]
      const conceptoNombre = String(row['Concepto']).trim()
      const monto = Number(row['Monto'])
      const categoria_id = inferirCategoriaId(conceptoNombre, categoriaMap)
      const key = `${mes}:${categoria_id}`
      presBucket[key] = (presBucket[key] ?? 0) + monto
    }
    const presInserts = Object.entries(presBucket).map(([key, monto_planificado]) => {
      const [mes, categoria_id] = key.split(':')
      return { mes: parseInt(mes), anio: ANIO, categoria_id, monto_planificado }
    })

    // 5. Construir inserts de gastos reales
    const gastInserts: object[] = []

    for (const row of datosGastRows) {
      const mes = MESES_MAP[String(row['Mes']).trim()]
      const conceptoNombre = String(row['Concepto']).trim()
      const personaNombre = String(row['Persona']).trim()
      const personaId = getPersonaId(personaNombre)!
      const monto = Number(row['Monto'])
      const nota = String(row['Notas'] ?? '').trim()
      const categoria_id = inferirCategoriaId(conceptoNombre, categoriaMap)
      const fecha = `${ANIO}-${String(mes).padStart(2,'0')}-15`
      const cuotaStr = String(row['Cuota'] ?? '').trim()
      const cuotaMatch = cuotaStr.match(/^(\d+)\/(\d+)$/)
      gastInserts.push({
        fecha,
        descripcion: conceptoNombre,
        categoria_id,
        persona_id: personaId,
        monto,
        nota,
        fuente: 'importar',
        pendiente_confirmacion: false,
        cuota_actual: cuotaMatch ? parseInt(cuotaMatch[1]) : null,
        cuotas_total: cuotaMatch ? parseInt(cuotaMatch[2]) : null,
      })
    }

    for (const row of realRows) {
      const mes = MESES_MAP[String(row['Mes']).trim()]
      const conceptoNombre = String(row['Concepto']).trim()
      const personaNombre = String(row['Persona']).trim().replace(/\s+/g,'')
      const personaId = getPersonaId(personaNombre)!
      const monto = Number(row['Monto Real'])
      const nota = String(row['Nota'] ?? '').trim()
      const categoria_id = inferirCategoriaId(conceptoNombre, categoriaMap)
      const fecha = `${ANIO}-${String(mes).padStart(2,'0')}-15`
      gastInserts.push({
        fecha,
        descripcion: conceptoNombre,
        categoria_id,
        persona_id: personaId,
        monto,
        nota,
        fuente: 'importar',
        pendiente_confirmacion: false,
      })
    }

    // 6. Limpiar e insertar todo en batch
    await Promise.all([
      db.from('ingresos').delete().eq('anio', ANIO),
      db.from('presupuesto').delete().eq('anio', ANIO),
      db.from('gastos').delete().eq('fuente', 'importar'),
      db.from('gastos').delete().eq('fuente', 'datos'),
    ])

    const [resIng, resPres, resGast] = await Promise.all([
      ingInserts.length ? db.from('ingresos').insert(ingInserts) : Promise.resolve({ error: null }),
      presInserts.length ? db.from('presupuesto').insert(presInserts) : Promise.resolve({ error: null }),
      gastInserts.length ? db.from('gastos').insert(gastInserts) : Promise.resolve({ error: null }),
    ])

    const errors = [
      resIng?.error && `ingresos: ${resIng.error.message}`,
      resPres?.error && `presupuesto: ${resPres.error.message}`,
      resGast?.error && `gastos: ${resGast.error.message}`,
    ].filter(Boolean)

    if (errors.length) {
      console.error('Import insert errors:', errors)
      return NextResponse.json({ error: errors.join(' | ') }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      ingresos: ingInserts.length,
      presupuesto: presInserts.length,
      gastos: gastInserts.length,
    })
  } catch (e: unknown) {
    console.error('Import error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
