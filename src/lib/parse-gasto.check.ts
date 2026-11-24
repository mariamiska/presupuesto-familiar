// Self-check del parser de carga rápida. Correr: node src/lib/parse-gasto.check.ts
import assert from 'node:assert/strict'
import { parseGasto } from './parse-gasto.ts'

const personas = [
  { id: 'p1', nombre: 'Augusto' },
  { id: 'p2', nombre: 'Miska' },
  { id: 'p3', nombre: 'Niños' },
  { id: 'p4', nombre: 'Casa' },
]
const categorias = [
  { id: 'c1', nombre: 'Transporte' },
  { id: 'c2', nombre: 'Salud' },
  { id: 'c3', nombre: 'Escuela' },
  { id: 'c4', nombre: 'Vivienda' },
]
const historial = [
  { descripcion: 'Farmacia', categoria: 'Salud' },
  { descripcion: 'Combustible Aprox', categoria: 'Transporte' },
]

// monto con y sin separadores
assert.equal(parseGasto('150000 nafta', personas, categorias).monto, 150000)
assert.equal(parseGasto('150.000 nafta', personas, categorias).monto, 150000)

// el monto es el número más grande, no el primero
assert.equal(parseGasto('2 entradas 50000', personas, categorias).monto, 50000)

// persona por nombre, sin importar acentos ni mayúsculas
assert.equal(parseGasto('150000 nafta AUGUSTO', personas, categorias).personaNombre, 'Augusto')
assert.equal(parseGasto('80000 utiles ninos', personas, categorias).personaNombre, 'Niños')

// categoría escrita explícitamente
assert.equal(parseGasto('50000 ropero en vivienda', personas, categorias).categoriaId, 'c4')

// categoría deducida del historial
assert.equal(parseGasto('345696 farmacia', personas, categorias, historial).categoriaId, 'c2')

// la descripción queda limpia: sin monto, sin persona, sin conectores
const r = parseGasto('35000 feria pedagogica rafa en escuela', personas, categorias)
assert.equal(r.monto, 35000)
assert.equal(r.categoriaId, 'c3')
assert.equal(r.descripcion, 'feria pedagogica rafa')

// no inventa: sin número no hay monto, sin match no hay categoría
const vacio = parseGasto('algo raro', personas, categorias)
assert.equal(vacio.monto, 0)
assert.equal(vacio.categoriaId, '')
assert.equal(vacio.personaNombre, '')

// "casa" como persona no se come la palabra dentro de otra ("casamiento")
assert.equal(parseGasto('200000 casamiento', personas, categorias).personaNombre, '')

console.log('parse-gasto: todo OK')
