import { CalendarFilter } from './components/CalendarFilter'
import { CategoryBarChart } from './components/CategoryBarChart'
import { CategoryTotals } from './components/CategoryTotals'
import { ConnectScreen } from './components/ConnectScreen'
import { GraphModal } from './components/GraphModal'
import { PeriodPicker } from './components/PeriodPicker'
import { SummaryHeader } from './components/SummaryHeader'
import { useTracker } from './hooks/useTracker'
import './App.css'

export default function App() {
  const tracker = useTracker()

  if (!tracker.isConnected) {
    return (
      <div className="app-shell">
        <ConnectScreen
          isGoogleConfigured={tracker.isGoogleConfigured}
          isLoading={tracker.isLoading}
          error={tracker.error}
          onConnectGoogle={() => void tracker.connectGoogle()}
          onImportIcs={(files) => void tracker.importIcs(files)}
        />
      </div>
    )
  }

  const hasCategories = Boolean(tracker.totals?.categories.length)

  return (
    <div className="app-shell">
      <div className="main-layout">
        <div className="main-column">
          <PeriodPicker
            period={tracker.period}
            isLoading={tracker.isLoading}
            onSetPeriod={tracker.setPeriod}
            onShift={tracker.shiftPeriod}
            onToday={tracker.jumpToToday}
            onRefresh={() => void tracker.refresh()}
            onDisconnect={() => void tracker.disconnect()}
            dataSourceLabel={tracker.dataSource === 'google' ? 'Google Calendar' : 'ICS import'}
          />

          <div className="scroll-stack">
            <SummaryHeader
              rangeLabel={tracker.rangeLabel}
              summaryValueText={tracker.summaryValueText}
              summaryCaption={tracker.summaryCaption}
              focusCalendars={tracker.focusCalendars}
              focusCalendarID={tracker.focusCalendarID}
              summaryMetric={tracker.summaryMetric}
              availableSummaryMetrics={tracker.availableSummaryMetrics}
              onFocusCalendar={tracker.setFocusCalendar}
              onSummaryMetric={tracker.setSummaryMetric}
              onOpenGraph={tracker.openGraph}
            />

            {tracker.error && <p className="error-text">{tracker.error}</p>}

            {hasCategories && tracker.totals ? (
              <>
                <CategoryBarChart totals={tracker.totals.categories} />
                <CategoryTotals totals={tracker.totals.categories} />
              </>
            ) : (
              <div className="card empty-state">
                <h2>No timed events in this period</h2>
                <p className="muted">
                  All-day events are excluded from totals. Try another day or enable more calendars.
                </p>
              </div>
            )}
          </div>
        </div>

        <CalendarFilter
          shownCalendars={tracker.shownCalendars}
          hiddenCalendars={tracker.hiddenCalendars}
          enabledCalendarIDs={tracker.enabledCalendarIDs}
          showHiddenCalendars={tracker.showHiddenCalendars}
          onToggleShowHidden={tracker.toggleShowHiddenCalendars}
          onToggleCalendar={tracker.toggleCalendar}
          dataSource={tracker.dataSource}
          onImportMoreIcs={(files) => void tracker.importIcs(files)}
        />
      </div>

      <GraphModal tracker={tracker} />
    </div>
  )
}
