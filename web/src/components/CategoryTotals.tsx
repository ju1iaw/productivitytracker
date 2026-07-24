import { formatDuration } from '../lib/durationFormatter'
import type { CategoryTotal } from '../types/models'
import { categoryColor } from '../types/models'

interface Props {
  totals: CategoryTotal[]
}

export function CategoryTotals({ totals }: Props) {
  return (
    <section className="card totals-card">
      <h2>By calendar</h2>
      <ul>
        {totals.map((item, index) => (
          <li key={item.id} className={index < totals.length - 1 ? 'has-divider' : ''}>
            <span className="color-dot" style={{ background: categoryColor(item.category) }} />
            <div className="total-meta">
              <span className="cal-title">{item.category.title}</span>
              <span className="muted caption">{item.category.sourceTitle}</span>
            </div>
            <div className="total-values">
              <span className="duration">{formatDuration(item.duration)}</span>
              <span className="muted caption">{Math.round(item.percentOfTotal * 100)}%</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
