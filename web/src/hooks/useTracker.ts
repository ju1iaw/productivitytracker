import { addDays, addMonths, addWeeks } from 'date-fns'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchGoogleCalendars,
  fetchGoogleEvents,
  isGoogleConfigured,
  requestGoogleAccessToken,
  revokeGoogleToken,
} from '../lib/googleCalendar'
import { parseIcsFiles } from '../lib/icsParser'
import {
  clearSession,
  loadFocusCalendarID,
  loadGoogleToken,
  loadShownCalendarOrder,
  saveFocusCalendarID,
  saveGoogleToken,
  saveShownCalendarOrder,
} from '../lib/storage'
import {
  aggregate,
  dateInterval,
  distributionSlices,
  formatRangeLabel,
  metricSeries,
  summaryValueText,
} from '../lib/timeAggregator'
import type {
  CalendarCategory,
  DataSourceKind,
  GraphMode,
  PeriodTotals,
  ReportPeriod,
  SummaryMetric,
  TimedEvent,
} from '../types/models'
import { availableMetrics, defaultMetric } from '../types/models'

export function useTracker() {
  const [dataSource, setDataSource] = useState<DataSourceKind | null>(null)
  const [googleToken, setGoogleToken] = useState<string | null>(() => loadGoogleToken())
  const [calendars, setCalendars] = useState<CalendarCategory[]>([])
  const [events, setEvents] = useState<TimedEvent[]>([])
  const [period, setPeriodState] = useState<ReportPeriod>('day')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [shownCalendarOrder, setShownCalendarOrder] = useState<string[]>(() => loadShownCalendarOrder())
  const [showHiddenCalendars, setShowHiddenCalendars] = useState(false)
  const [focusCalendarID, setFocusCalendarIDState] = useState<string | null>(() => loadFocusCalendarID())
  const [summaryMetric, setSummaryMetric] = useState<SummaryMetric>('percentageOfTime')
  const [totals, setTotals] = useState<PeriodTotals | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGraphPresented, setIsGraphPresented] = useState(false)
  const [graphMode, setGraphMode] = useState<GraphMode>('pieDistribution')
  const [graphCalendarID, setGraphCalendarID] = useState<string | null>(null)
  const [graphMetric, setGraphMetric] = useState<SummaryMetric>('totalTime')
  const [didInitSelection, setDidInitSelection] = useState(false)

  const enabledCalendarIDs = useMemo(() => new Set(shownCalendarOrder), [shownCalendarOrder])
  const currentRange = useMemo(() => dateInterval(period, anchorDate), [period, anchorDate])

  const shownCalendars = useMemo(() => {
    const byID = new Map(calendars.map((c) => [c.id, c]))
    return shownCalendarOrder.map((id) => byID.get(id)).filter((c): c is CalendarCategory => Boolean(c))
  }, [calendars, shownCalendarOrder])

  const hiddenCalendars = useMemo(
    () => calendars.filter((c) => !enabledCalendarIDs.has(c.id)),
    [calendars, enabledCalendarIDs],
  )

  const isConnected = dataSource === 'ics' || (dataSource === 'google' && Boolean(googleToken))

  const persistSelection = useCallback((order: string[], focus: string | null) => {
    saveShownCalendarOrder(order)
    saveFocusCalendarID(focus)
  }, [])

  const syncFocus = useCallback((order: string[], focus: string | null, list: CalendarCategory[]) => {
    const byID = new Map(list.map((c) => [c.id, c]))
    const shown = order.map((id) => byID.get(id)).filter(Boolean)
    if (focus && shown.some((c) => c?.id === focus)) return focus
    return shown[0]?.id ?? null
  }, [])

  const applyCalendars = useCallback(
    (nextCalendars: CalendarCategory[]) => {
      setCalendars(nextCalendars)
      const ids = new Set(nextCalendars.map((c) => c.id))
      setShownCalendarOrder((prev) => {
        const nextOrder = prev.filter((id) => ids.has(id))
        const nextFocus = syncFocus(nextOrder, focusCalendarID, nextCalendars)
        setFocusCalendarIDState(nextFocus)
        persistSelection(nextOrder, nextFocus)
        setDidInitSelection(true)
        return nextOrder
      })
    },
    [focusCalendarID, persistSelection, syncFocus],
  )

  const recomputeTotals = useCallback(
    (sourceEvents: TimedEvent[], sourceCalendars: CalendarCategory[], order: string[]) => {
      const enabled = new Set(order)
      const selected = sourceCalendars.filter((c) => enabled.has(c.id))
      const range = dateInterval(period, anchorDate)
      setTotals(aggregate(sourceEvents, selected, period, range))
    },
    [period, anchorDate],
  )

  const refreshGoogleEvents = useCallback(
    async (token: string, order: string[], sourceCalendars: CalendarCategory[]) => {
      setIsLoading(true)
      setError(null)
      try {
        const range = dateInterval(period, anchorDate)
        const nextEvents = await fetchGoogleEvents(token, order, range)
        setEvents(nextEvents)
        recomputeTotals(nextEvents, sourceCalendars, order)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events')
      } finally {
        setIsLoading(false)
      }
    },
    [period, anchorDate, recomputeTotals],
  )

  const connectGoogle = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = await requestGoogleAccessToken(true)
      setGoogleToken(token)
      saveGoogleToken(token)
      setDataSource('google')
      const nextCalendars = await fetchGoogleCalendars(token)
      applyCalendars(nextCalendars)
      const order = loadShownCalendarOrder().filter((id) => nextCalendars.some((c) => c.id === id))
      await refreshGoogleEvents(token, order, nextCalendars)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setDataSource(null)
    } finally {
      setIsLoading(false)
    }
  }, [applyCalendars, refreshGoogleEvents])

  const importIcs = useCallback(
    async (files: FileList | File[]) => {
      setIsLoading(true)
      setError(null)
      try {
        const { calendars: importedCalendars, events: importedEvents } = await parseIcsFiles(files)
        setDataSource('ics')
        setGoogleToken(null)
        saveGoogleToken(null)

        setCalendars((prev) => {
          const merging = dataSource === 'ics'
          const byID = new Map((merging ? prev : []).map((c) => [c.id, c]))
          for (const calendar of importedCalendars) byID.set(calendar.id, calendar)
          return Array.from(byID.values())
        })

        setEvents((prev) => {
          const merging = dataSource === 'ics'
          const importedIDs = new Set(importedCalendars.map((c) => c.id))
          const kept = merging ? prev.filter((e) => !importedIDs.has(e.calendarID)) : []
          return [...kept, ...importedEvents]
        })

        setShownCalendarOrder((prev) => {
          const merging = dataSource === 'ics'
          const importedIDs = importedCalendars.map((c) => c.id)
          const next = merging
            ? [...importedIDs, ...prev.filter((id) => !importedIDs.includes(id))]
            : importedIDs
          const focus = next[0] ?? null
          setFocusCalendarIDState(focus)
          persistSelection(next, focus)
          setDidInitSelection(true)
          return next
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import ICS')
      } finally {
        setIsLoading(false)
      }
    },
    [dataSource, persistSelection],
  )

  const disconnect = useCallback(async () => {
    if (googleToken) {
      try {
        await revokeGoogleToken(googleToken)
      } catch {
        // ignore revoke errors
      }
    }
    clearSession()
    setGoogleToken(null)
    setDataSource(null)
    setCalendars([])
    setEvents([])
    setTotals(null)
    setError(null)
  }, [googleToken])

  const refresh = useCallback(async () => {
    if (dataSource === 'google' && googleToken) {
      setIsLoading(true)
      setError(null)
      try {
        const nextCalendars = await fetchGoogleCalendars(googleToken)
        applyCalendars(nextCalendars)
        await refreshGoogleEvents(googleToken, shownCalendarOrder, nextCalendars)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Refresh failed')
        setIsLoading(false)
      }
      return
    }
    if (dataSource === 'ics') {
      recomputeTotals(events, calendars, shownCalendarOrder)
    }
  }, [
    dataSource,
    googleToken,
    applyCalendars,
    refreshGoogleEvents,
    shownCalendarOrder,
    events,
    calendars,
    recomputeTotals,
  ])

  // Reload Google events when period / anchor / selection changes.
  useEffect(() => {
    if (dataSource !== 'google' || !googleToken || !didInitSelection) return
    void refreshGoogleEvents(googleToken, shownCalendarOrder, calendars)
  }, [dataSource, googleToken, period, anchorDate, shownCalendarOrder, didInitSelection]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute ICS totals when navigation / selection changes (events already in memory).
  useEffect(() => {
    if (dataSource !== 'ics') return
    recomputeTotals(events, calendars, shownCalendarOrder)
  }, [dataSource, period, anchorDate, shownCalendarOrder, events, calendars, recomputeTotals])

  // Restore Google session on load if token exists.
  useEffect(() => {
    const token = loadGoogleToken()
    if (!token || !isGoogleConfigured()) return
    setDataSource('google')
    setGoogleToken(token)
    ;(async () => {
      setIsLoading(true)
      try {
        const nextCalendars = await fetchGoogleCalendars(token)
        applyCalendars(nextCalendars)
        const order = loadShownCalendarOrder().filter((id) => nextCalendars.some((c) => c.id === id))
        await refreshGoogleEvents(token, order, nextCalendars)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Session expired — sign in again')
        clearSession()
        setGoogleToken(null)
        setDataSource(null)
      } finally {
        setIsLoading(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setPeriod = (newPeriod: ReportPeriod) => {
    setPeriodState(newPeriod)
    if (!availableMetrics(newPeriod).includes(summaryMetric)) {
      setSummaryMetric(defaultMetric(newPeriod))
    }
    if (!availableMetrics(newPeriod).includes(graphMetric)) {
      setGraphMetric(defaultMetric(newPeriod))
    }
  }

  const shiftPeriod = (value: number) => {
    setAnchorDate((current) => {
      if (period === 'day') return addDays(current, value)
      if (period === 'week') return addWeeks(current, value)
      return addMonths(current, value)
    })
  }

  const jumpToToday = () => setAnchorDate(new Date())

  const toggleCalendar = (id: string) => {
    setShownCalendarOrder((prev) => {
      let next: string[]
      if (prev.includes(id)) {
        next = prev.filter((x) => x !== id)
      } else {
        next = [id, ...prev.filter((x) => x !== id)]
      }
      const nextFocus = syncFocus(next, focusCalendarID, calendars)
      setFocusCalendarIDState(nextFocus)
      persistSelection(next, nextFocus)
      return next
    })
  }

  const setFocusCalendar = (id: string | null) => {
    setFocusCalendarIDState(id)
    persistSelection(shownCalendarOrder, id)
  }

  const focusCalendarTitle =
    shownCalendars.find((c) => c.id === focusCalendarID)?.title ?? 'Calendar'

  const focusDuration =
    totals?.categories.find((c) => c.id === focusCalendarID)?.duration ?? 0

  const rangeLabel = formatRangeLabel(period, currentRange)
  const summaryText = summaryValueText(focusDuration, summaryMetric, currentRange)
  const summaryCaption = `${
    {
      percentageOfTime: 'Percentage of time',
      totalTime: 'Total time',
      averagePerDay: 'Average time per day',
      averagePerWeek: 'Average time per week',
    }[summaryMetric]
  } · ${focusCalendarTitle}`

  const prepareGraphDefaults = () => {
    if (!graphCalendarID || !enabledCalendarIDs.has(graphCalendarID)) {
      setGraphCalendarID(focusCalendarID ?? shownCalendars[0]?.id ?? null)
    }
    if (!availableMetrics(period).includes(graphMetric)) {
      setGraphMetric(defaultMetric(period))
    }
  }

  const openGraph = () => {
    prepareGraphDefaults()
    setIsGraphPresented(true)
  }

  const graphMetricSeries = useMemo(() => {
    if (!graphCalendarID) return []
    return metricSeries(graphCalendarID, events, graphMetric, period, currentRange)
  }, [graphCalendarID, events, graphMetric, period, currentRange])

  const graphSlices = useCallback(
    (includeZero: boolean) => distributionSlices(shownCalendars, events, currentRange, includeZero),
    [shownCalendars, events, currentRange],
  )

  return {
    isGoogleConfigured: isGoogleConfigured(),
    isConnected,
    dataSource,
    isLoading,
    error,
    calendars,
    events,
    period,
    setPeriod,
    anchorDate,
    shiftPeriod,
    jumpToToday,
    shownCalendars,
    hiddenCalendars,
    enabledCalendarIDs,
    showHiddenCalendars,
    toggleShowHiddenCalendars: () => setShowHiddenCalendars((v) => !v),
    toggleCalendar,
    focusCalendarID,
    setFocusCalendar,
    focusCalendars: shownCalendars,
    summaryMetric,
    setSummaryMetric,
    availableSummaryMetrics: availableMetrics(period),
    rangeLabel,
    summaryValueText: summaryText,
    summaryCaption,
    totals,
    refresh,
    connectGoogle,
    importIcs,
    disconnect,
    isGraphPresented,
    setIsGraphPresented,
    openGraph,
    graphMode,
    setGraphMode,
    graphCalendarID,
    setGraphCalendarID,
    graphMetric,
    setGraphMetric,
    graphMetricSeries,
    graphSlices,
  }
}

export type TrackerState = ReturnType<typeof useTracker>
