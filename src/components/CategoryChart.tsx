'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatGs } from '@/lib/supabase'

type Item = { nombre: string; total: number; color?: string; icono?: string }

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
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? '#9ca3af'} />
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
      <div className="mt-2 space-y-1.5">
        {data.slice(0, 12).map((d) => (
          <div key={d.nombre} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {d.icono
                ? <span className="text-base leading-none">{d.icono}</span>
                : <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color ?? '#9ca3af' }}/>
              }
              <span className="text-gray-700">{d.nombre}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{total > 0 ? ((d.total / total) * 100).toFixed(1) : 0}%</span>
              <span className="font-semibold text-gray-800 w-24 text-right">{formatGs(d.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
