import type { CalendarCategory, SummaryMetric } from '../types/models'
import { SUMMARY_METRIC_LABELS } from '../types/models'

interface Props {
  rangeLabel: string
  summaryValueText: string
  summaryCaption: string
  focusCalendars: CalendarCategory[]
  focusCalendarID: string | null
  summaryMetric: SummaryMetric
  availableSummaryMetrics: SummaryMetric[]
  onFocusCalendar: (id: string | null) => void
  onSummaryMetric: (metric: SummaryMetric) => void
  onOpenGraph: () => void
}

export function SummaryHeader({
  rangeLabel,
  summaryValueText,
  summaryCaption,
  focusCalendars,
  focusCalendarID,
  summaryMetric,
  availableSummaryMetrics,
  onFocusCalendar,
  onSummaryMetric,
  onOpenGraph,
}: Props) {
  return (
    <header className="summary-header">
      <h1>{rangeLabel}</h1>
      <p className="summary-value">{summaryValueText}</p>
      <p className="muted">{summaryCaption}</p>

      <div className="summary-controls">
        <label>
          <span className="field-label">Calendar</span>
          <select
            value={focusCalendarID ?? ''}
            onChange={(e) => onFocusCalendar(e.target.value || null)}
          >
            {focusCalendars.length === 0 ? (
              <option value="">No calendars</option>
            ) : (
              focusCalendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))
            )}
          </select>
        </label>

        <label>
          <span className="field-label">Show</span>
          <select
            value={summaryMetric}
            onChange={(e) => onSummaryMetric(e.target.value as SummaryMetric)}
          >
            {availableSummaryMetrics.map((m) => (
              <option key={m} value={m}>
                {SUMMARY_METRIC_LABELS[m]}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="btn btn-primary graph-btn" onClick={onOpenGraph}>
          Graph
        </button>
      </div>
    </header>
  )
}
