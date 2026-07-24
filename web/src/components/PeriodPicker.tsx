import type { ReportPeriod } from '../types/models'
import { REPORT_PERIODS } from '../types/models'

interface Props {
  period: ReportPeriod
  isLoading: boolean
  onSetPeriod: (period: ReportPeriod) => void
  onShift: (delta: number) => void
  onToday: () => void
  onRefresh: () => void
  onDisconnect: () => void
  dataSourceLabel: string
}

export function PeriodPicker({
  period,
  isLoading,
  onSetPeriod,
  onShift,
  onToday,
  onRefresh,
  onDisconnect,
  dataSourceLabel,
}: Props) {
  return (
    <div className="period-picker card">
      <div className="segmented" role="tablist" aria-label="Period">
        {REPORT_PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period === p.id}
            className={period === p.id ? 'active' : ''}
            onClick={() => onSetPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="nav-group">
        <button type="button" className="btn" onClick={() => onShift(-1)} aria-label="Previous">
          ‹
        </button>
        <button type="button" className="btn" onClick={onToday}>
          Today
        </button>
        <button type="button" className="btn" onClick={() => onShift(1)} aria-label="Next">
          ›
        </button>
      </div>

      <div className="period-spacer" />

      <span className="source-chip muted">{dataSourceLabel}</span>

      <button type="button" className="btn" onClick={onRefresh} disabled={isLoading}>
        {isLoading ? 'Loading…' : 'Refresh'}
      </button>
      <button type="button" className="btn" onClick={onDisconnect}>
        Disconnect
      </button>
    </div>
  )
}
