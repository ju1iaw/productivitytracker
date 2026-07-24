import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDuration } from '../lib/durationFormatter'
import type { TrackerState } from '../hooks/useTracker'
import {
  GRAPH_MODE_LABELS,
  SUMMARY_METRIC_LABELS,
  categoryColor,
  sliceColor,
  type GraphMode,
  type SummaryMetric,
} from '../types/models'

interface Props {
  tracker: TrackerState
}

export function GraphModal({ tracker }: Props) {
  if (!tracker.isGraphPresented) return null

  const {
    rangeLabel,
    graphMode,
    setGraphMode,
    graphCalendarID,
    setGraphCalendarID,
    graphMetric,
    setGraphMetric,
    focusCalendars,
    availableSummaryMetrics,
    graphMetricSeries,
    graphSlices,
    setIsGraphPresented,
  } = tracker

  const pieData = graphSlices(false).map((s) => ({
    ...s,
    fill: sliceColor(s),
  }))
  const barData = graphSlices(true).map((s) => ({
    ...s,
    hours: s.duration / 3600,
    fill: sliceColor(s),
  }))
  const focusColor = focusCalendars.find((c) => c.id === graphCalendarID)
  const metricColor = focusColor ? categoryColor(focusColor) : 'var(--accent)'

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => setIsGraphPresented(false)}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="graph-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="graph-title">Graphs</h2>
            <p className="muted">{rangeLabel}</p>
          </div>
          <button type="button" className="btn" onClick={() => setIsGraphPresented(false)}>
            Done
          </button>
        </div>

        <div className="graph-controls">
          <label>
            <span className="field-label">Graph</span>
            <select
              value={graphMode}
              onChange={(e) => setGraphMode(e.target.value as GraphMode)}
            >
              {(Object.keys(GRAPH_MODE_LABELS) as GraphMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {GRAPH_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          </label>

          {graphMode === 'calendarMetric' && (
            <>
              <label>
                <span className="field-label">Calendar</span>
                <select
                  value={graphCalendarID ?? ''}
                  onChange={(e) => setGraphCalendarID(e.target.value || null)}
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
                <span className="field-label">Metric</span>
                <select
                  value={graphMetric}
                  onChange={(e) => setGraphMetric(e.target.value as SummaryMetric)}
                >
                  {availableSummaryMetrics.map((m) => (
                    <option key={m} value={m}>
                      {SUMMARY_METRIC_LABELS[m]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>

        <div className="graph-body card">
          {graphMode === 'calendarMetric' && (
            focusCalendars.length === 0 ? (
              <p className="muted empty-graph">Select at least one calendar to graph.</p>
            ) : graphMetricSeries.length === 0 ? (
              <p className="muted empty-graph">No data for this metric in the selected period.</p>
            ) : (
              <>
                <h3>
                  {SUMMARY_METRIC_LABELS[graphMetric]} ·{' '}
                  {focusCalendars.find((c) => c.id === graphCalendarID)?.title ?? 'Calendar'}
                </h3>
                <div style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={graphMetricSeries}>
                      <CartesianGrid stroke="var(--divider)" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
                      <YAxis stroke="var(--muted)" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="value" fill={metricColor} radius={[4, 4, 0, 0]} name={graphMetricSeries[0]?.unitLabel} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )
          )}

          {graphMode === 'pieDistribution' && (
            focusCalendars.length === 0 ? (
              <p className="muted empty-graph">Select calendars in the sidebar to build a pie chart.</p>
            ) : pieData.length === 0 ? (
              <p className="muted empty-graph">No timed data in this period.</p>
            ) : (
              <>
                <h3>Selected calendars + untracked</h3>
                <div className="pie-layout">
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="duration"
                          nameKey="title"
                          innerRadius="45%"
                          outerRadius="80%"
                          paddingAngle={1.5}
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.id} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) =>
                            formatDuration(typeof value === 'number' ? value : Number(value) || 0)
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="pie-legend">
                    {pieData.map((slice) => (
                      <li key={slice.id}>
                        <span className="color-dot" style={{ background: slice.fill }} />
                        <span>{slice.title}</span>
                        <span className="muted">{formatDuration(slice.duration)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )
          )}

          {graphMode === 'barComparison' && (
            focusCalendars.length === 0 ? (
              <p className="muted empty-graph">Select calendars in the sidebar to compare.</p>
            ) : (
              <>
                <h3>Compare selected calendars + untracked</h3>
                <div style={{ width: '100%', height: Math.max(barData.length, 1) * 36 + 40 }}>
                  <ResponsiveContainer>
                    <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid stroke="var(--divider)" horizontal={false} />
                      <XAxis type="number" stroke="var(--muted)" fontSize={12} />
                      <YAxis type="category" dataKey="title" width={120} stroke="var(--ink)" fontSize={12} />
                      <Tooltip
                        formatter={(value) => {
                          const hours = typeof value === 'number' ? value : Number(value)
                          return [`${Number.isFinite(hours) ? hours.toFixed(1) : '0'}h`, 'Hours']
                        }}
                      />
                      <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                        {barData.map((entry) => (
                          <Cell key={entry.id} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  )
}
