import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type {
  CalendarCategory,
  CategoryTotal,
  DateRange,
  GraphSeriesPoint,
  GraphSlice,
  PeriodTotals,
  ReportPeriod,
  SummaryMetric,
  TimedEvent,
} from '../types/models'
import { formatDuration } from './durationFormatter'

export function dateInterval(period: ReportPeriod, containing: Date): DateRange {
  switch (period) {
    case 'day': {
      const start = startOfDay(containing)
      return { start, end: addDays(start, 1) }
    }
    case 'week': {
      const start = startOfWeek(containing, { weekStartsOn: 0 })
      return { start, end: addDays(start, 7) }
    }
    case 'month': {
      const start = startOfMonth(containing)
      return { start, end: addMonths(start, 1) }
    }
  }
}

export function clippedDuration(event: TimedEvent, range: DateRange): number {
  const overlapStart = Math.max(event.startDate.getTime(), range.start.getTime())
  const overlapEnd = Math.min(event.endDate.getTime(), range.end.getTime())
  return Math.max(0, (overlapEnd - overlapStart) / 1000)
}

export function dayCount(range: DateRange): number {
  return Math.max(differenceInCalendarDays(range.end, range.start), 1)
}

export function periodSeconds(range: DateRange): number {
  return dayCount(range) * 24 * 60 * 60
}

export function aggregate(
  events: TimedEvent[],
  categories: CalendarCategory[],
  period: ReportPeriod,
  range: DateRange,
): PeriodTotals {
  const categoryByID = new Map(categories.map((c) => [c.id, c]))
  const secondsByCalendar = new Map<string, number>()

  for (const event of events) {
    if (event.isAllDay) continue
    const clipped = clippedDuration(event, range)
    if (clipped <= 0) continue
    secondsByCalendar.set(event.calendarID, (secondsByCalendar.get(event.calendarID) ?? 0) + clipped)
  }

  let totalDuration = 0
  const categoryTotals: CategoryTotal[] = []

  for (const [calendarID, duration] of secondsByCalendar) {
    const category = categoryByID.get(calendarID)
    if (!category) continue
    totalDuration += duration
    categoryTotals.push({
      id: calendarID,
      category,
      duration,
      percentOfTotal: duration / (24 * 60 * 60),
    })
  }

  categoryTotals.sort((a, b) => {
    if (a.duration === b.duration) {
      return a.category.title.localeCompare(b.category.title, undefined, { sensitivity: 'base' })
    }
    return b.duration - a.duration
  })

  return {
    period,
    rangeStart: range.start,
    rangeEnd: range.end,
    categories: categoryTotals,
    totalDuration,
  }
}

export function durationForCalendar(
  calendarID: string,
  events: TimedEvent[],
  range: DateRange,
): number {
  return events
    .filter((e) => !e.isAllDay && e.calendarID === calendarID)
    .reduce((sum, e) => sum + clippedDuration(e, range), 0)
}

function dayIntervals(range: DateRange): DateRange[] {
  const days = eachDayOfInterval({
    start: range.start,
    end: addDays(range.end, -1),
  })
  return days.map((day) => {
    const start = startOfDay(day)
    const end = addDays(start, 1)
    return {
      start: new Date(Math.max(start.getTime(), range.start.getTime())),
      end: new Date(Math.min(end.getTime(), range.end.getTime())),
    }
  })
}

function weekIntervals(range: DateRange): DateRange[] {
  const intervals: DateRange[] = []
  let cursor = range.start

  while (cursor < range.end) {
    const weekStart = startOfWeek(cursor, { weekStartsOn: 0 })
    const weekEnd = addDays(weekStart, 7)
    const start = new Date(Math.max(weekStart.getTime(), range.start.getTime()))
    const end = new Date(Math.min(weekEnd.getTime(), range.end.getTime()))
    if (end > start) intervals.push({ start, end })
    cursor = weekEnd
  }

  return intervals
}

function metricPoint(
  id: string,
  label: string,
  duration: number,
  bucketSeconds: number,
  metric: SummaryMetric,
): GraphSeriesPoint {
  if (metric === 'percentageOfTime') {
    const percent = bucketSeconds > 0 ? (duration / bucketSeconds) * 100 : 0
    return { id, label, value: percent, unitLabel: 'Percent' }
  }
  return { id, label, value: duration / 3600, unitLabel: 'Hours' }
}

export function metricSeries(
  calendarID: string,
  events: TimedEvent[],
  metric: SummaryMetric,
  period: ReportPeriod,
  range: DateRange,
): GraphSeriesPoint[] {
  switch (period) {
    case 'day': {
      const duration = durationForCalendar(calendarID, events, range)
      return [
        metricPoint('day', 'Day', duration, periodSeconds(range), metric),
      ]
    }
    case 'week':
      return dayIntervals(range).map((day, index) => {
        const duration = durationForCalendar(calendarID, events, day)
        return metricPoint(
          `d${index}`,
          format(day.start, 'EEE'),
          duration,
          periodSeconds(day),
          metric,
        )
      })
    case 'month':
      if (metric === 'averagePerWeek') {
        return weekIntervals(range).map((week, index) => {
          const duration = durationForCalendar(calendarID, events, week)
          return metricPoint(
            `w${index}`,
            format(week.start, 'MMM d'),
            duration,
            periodSeconds(week),
            'totalTime',
          )
        })
      }
      return dayIntervals(range).map((day, index) => {
        const duration = durationForCalendar(calendarID, events, day)
        const pointMetric = metric === 'averagePerDay' ? 'totalTime' : metric
        return metricPoint(
          `d${index}`,
          format(day.start, 'd'),
          duration,
          periodSeconds(day),
          pointMetric,
        )
      })
  }
}

export function distributionSlices(
  shownCalendars: CalendarCategory[],
  events: TimedEvent[],
  range: DateRange,
  includeZeroCalendars: boolean,
): GraphSlice[] {
  const totalPeriod = periodSeconds(range)
  let tracked = 0
  const slices: GraphSlice[] = []

  for (const calendar of shownCalendars) {
    const duration = durationForCalendar(calendar.id, events, range)
    tracked += duration
    if (includeZeroCalendars || duration > 0) {
      slices.push({
        id: calendar.id,
        title: calendar.title,
        duration,
        red: calendar.red,
        green: calendar.green,
        blue: calendar.blue,
        alpha: calendar.alpha,
      })
    }
  }

  const untracked = Math.max(0, totalPeriod - tracked)
  if (includeZeroCalendars || untracked > 0) {
    slices.push({
      id: 'untracked',
      title: 'Untracked',
      duration: untracked,
      red: 0.72,
      green: 0.76,
      blue: 0.82,
      alpha: 1,
    })
  }

  return slices
}

export function formatRangeLabel(period: ReportPeriod, range: DateRange): string {
  if (period === 'day') {
    return format(range.start, 'EEEE, MMMM d, yyyy')
  }
  const inclusiveEnd = new Date(range.end.getTime() - 1)
  return `${format(range.start, 'MMM d, yyyy')} – ${format(inclusiveEnd, 'MMM d, yyyy')}`
}

export function summaryValueText(
  duration: number,
  metric: SummaryMetric,
  range: DateRange,
): string {
  const days = dayCount(range)
  const seconds = days * 24 * 60 * 60

  switch (metric) {
    case 'totalTime':
      return formatDuration(duration)
    case 'percentageOfTime': {
      const percent = seconds > 0 ? (duration / seconds) * 100 : 0
      return `${Math.round(percent)}%`
    }
    case 'averagePerDay':
      return formatDuration(days > 0 ? duration / days : 0)
    case 'averagePerWeek': {
      const weeks = days / 7
      return formatDuration(weeks > 0 ? duration / weeks : 0)
    }
  }
}

export { formatDuration }
