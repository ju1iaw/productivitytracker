import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CategoryTotal } from '../types/models'
import { categoryColor } from '../types/models'

interface Props {
  totals: CategoryTotal[]
}

export function CategoryBarChart({ totals }: Props) {
  const data = totals.map((item) => ({
    id: item.id,
    name: item.category.title,
    hours: item.duration / 3600,
    fill: categoryColor(item.category),
  }))

  const height = Math.max(totals.length, 1) * 36 + 40

  return (
    <section className="card chart-card">
      <h2>Time distribution</h2>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid stroke="var(--divider)" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `${Math.round(v)}h`}
              stroke="var(--muted)"
              fontSize={12}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              stroke="var(--ink)"
              fontSize={12}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => {
                const hours = typeof value === 'number' ? value : Number(value)
                return [`${Number.isFinite(hours) ? hours.toFixed(1) : '0'}h`, 'Hours']
              }}
            />
            <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
