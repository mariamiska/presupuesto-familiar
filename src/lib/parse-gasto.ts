export type Opcion = { id: string; nombre: string }
export type Previo = { descripcion?: string | null; categoria?: string | null }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Convierte una línea dictada en los campos de un gasto.
 * "150.000 nafta augusto" -> monto 150000, persona Augusto, categoría Transporte.
 *
 * El monto es el número más grande: así "2 entradas 50000" toma 50000 y no el 2.
 * La categoría sale del nombre si está escrito; si no, de un gasto anterior con
 * una palabra en común (así "farmacia" cae en Salud sin que nadie lo configure).
 *
 * ponytail: el historial que recibe son los gastos del mes a la vista, no toda la
 * base — alcanza para lo que se repite. Si no adivina, los campos quedan vacíos y
 * se eligen a mano. Upgrade: un índice descripción→categoría sobre todos los gastos.
 */
export function parseGasto(
  texto: string,
  personas: Opcion[],
  categorias: Opcion[],
  historial: Previo[] = [],
) {
  const t = norm(texto)

  const crudos = texto.match(/\d[\d.,]*/g) ?? []
  const montos = crudos.map(n => parseInt(n.replace(/[.,]/g, ''), 10)).filter(n => n > 0)
  const monto = montos.length ? Math.max(...montos) : 0

  const hallar = (ops: Opcion[]) =>
    ops.find(o => new RegExp(`(^|\\s)${escapar(norm(o.nombre))}(\\s|$)`).test(t))

  const persona = hallar(personas)
  let categoria = hallar(categorias)

  if (!categoria) {
    const previo = historial.find(h =>
      h.descripcion && h.categoria &&
      norm(h.descripcion).split(/\s+/).some(w => w.length > 3 && t.includes(w)),
    )
    if (previo) categoria = categorias.find(c => c.nombre === previo.categoria)
  }

  let desc = texto
  for (const n of crudos) desc = desc.replace(n, ' ')
  for (const o of [persona, categoria]) {
    if (o) desc = desc.replace(new RegExp(`(^|\\s)${escapar(o.nombre)}(\\s|$)`, 'i'), ' ')
  }
  desc = desc.replace(/(^|\s)(en|de|para|del|a|al|el|la|los|las)(?=\s|$)/gi, ' ')
             .replace(/\s+/g, ' ').trim()

  return {
    monto,
    descripcion: desc,
    personaNombre: persona?.nombre ?? '',
    categoriaId: categoria?.id ?? '',
  }
}
