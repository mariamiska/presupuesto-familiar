import { supabase } from '@/lib/supabase'
import SimularClient from './SimularClient'

const MES_ACTUAL = new Date().getMonth() + 1
const ANIO_ACTUAL = new Date().getFullYear()

export default async function SimularPage() {
  const { data: ingresosData } = await supabase
    .from('ingresos')
    .select('monto')
    .eq('mes', MES_ACTUAL)
    .eq('anio', ANIO_ACTUAL)

  const ingMes = ingresosData?.reduce((s, r) => s + r.monto, 0) ?? 0

  const fechaInicio = `${ANIO_ACTUAL}-${String(MES_ACTUAL).padStart(2,'0')}-01`
  const fechaFin = `${ANIO_ACTUAL}-${String(MES_ACTUAL).padStart(2,'0')}-31`

  const { data: gastosData } = await supabase
    .from('gastos')
    .select('monto')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)

  const gastMes = gastosData?.reduce((s, r) => s + r.monto, 0) ?? 0

  return <SimularClient ingMes={ingMes} gastMes={gastMes} mesActual={MES_ACTUAL} />
}
