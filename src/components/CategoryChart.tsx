'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatGs } from '@/lib/supabase'

const COLORS = [
  '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6',
  '#06B6D4','#F97316','#84CC16','#EC4899','#6366F1',
  '#14B8A6','#FB923C',
]

type Item = { nombre: string; total: number }

export function CategoryChart({ data }: { data: Item[] }) {
  if (!data.length) return null
  const total = data.reduce((s, d) => s + d.total, 0)

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="nombre"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={45}
            paddingAngle={2}
            label={({ percent }: { percent?: number }) =>
              (percent ?? 0) > 0.04 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
            }
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [formatGs(Number(value)), String(name)]}
            contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e5e7eb' }}
          />
          <Legend
            formatter={(value) => <span style={{ fontSize: 12, color: '#374151' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Tabla resumen */}
      <div className="mt-2 space-y-1.5">
        {data.slice(0, 8).map((d, i) => (
          <div key={d.nombre} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}/>
              <span className="text-gray-700">{d.nombre}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{total > 0 ? ((d.total / total) * 100).toFixed(1) : 0}%</span>
              <span className="font-semibold text-gray-800 w-24 text-right">{formatGs(d.total)}</span>
            </div>
          </div>
        ))}
        {data.length > 8 && (
          <p className="text-xs text-gray-400 text-right">+ {data.length - 8} categorías más</p>
        )}
      </div>
    </div>
  )
}
