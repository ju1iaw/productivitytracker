export type ReportPeriod = 'day' | 'week' | 'month'

export type SummaryMetric =
  | 'percentageOfTime'
  | 'totalTime'
  | 'averagePerDay'
  | 'averagePerWeek'

export type GraphMode = 'calendarMetric' | 'pieDistribution' | 'barComparison'

export type DataSourceKind = 'google' | 'ics'

export interface TimedEvent {
  id: string
  title: string
  startDate: Date
  endDate: Date
  isAllDay: boolean
  calendarID: string
}

export interface CalendarCategory {
  id: string
  title: string
  red: number
  green: number
  blue: number
  alpha: number
  sourceTitle: string
}

export interface CategoryTotal {
  id: string
  category: CalendarCategory
  duration: number
  percentOfTotal: number
}

export interface PeriodTotals {
  period: ReportPeriod
  rangeStart: Date
  rangeEnd: Date
  categories: CategoryTotal[]
  totalDuration: number
}

export interface DateRange {
  start: Date
  end: Date
}

export interface GraphSlice {
  id: string
  title: string
  duration: number
  red: number
  green: number
  blue: number
  alpha: number
}

export interface GraphSeriesPoint {
  id: string
  label: string
  value: number
  unitLabel: string
}

export const REPORT_PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

export const SUMMARY_METRIC_LABELS: Record<SummaryMetric, string> = {
  percentageOfTime: 'Percentage of time',
  totalTime: 'Total time',
  averagePerDay: 'Average time per day',
  averagePerWeek: 'Average time per week',
}

export const GRAPH_MODE_LABELS: Record<GraphMode, string> = {
  calendarMetric: 'Calendar metric',
  pieDistribution: 'Pie chart',
  barComparison: 'Bar comparison',
}

export function availableMetrics(period: ReportPeriod): SummaryMetric[] {
  switch (period) {
    case 'day':
      return ['percentageOfTime', 'totalTime']
    case 'week':
      return ['averagePerDay', 'percentageOfTime', 'totalTime']
    case 'month':
      return ['averagePerDay', 'averagePerWeek', 'percentageOfTime', 'totalTime']
  }
}

export function defaultMetric(period: ReportPeriod): SummaryMetric {
  return availableMetrics(period)[0] ?? 'totalTime'
}

export function categoryColor(category: CalendarCategory): string {
  const { red, green, blue, alpha } = category
  return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${alpha})`
}

export function sliceColor(slice: GraphSlice): string {
  return `rgba(${Math.round(slice.red * 255)}, ${Math.round(slice.green * 255)}, ${Math.round(slice.blue * 255)}, ${slice.alpha})`
}
