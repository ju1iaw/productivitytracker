import type { CalendarCategory } from '../types/models'
import { categoryColor } from '../types/models'

interface Props {
  shownCalendars: CalendarCategory[]
  hiddenCalendars: CalendarCategory[]
  enabledCalendarIDs: Set<string>
  showHiddenCalendars: boolean
  onToggleShowHidden: () => void
  onToggleCalendar: (id: string) => void
  onImportMoreIcs?: (files: FileList) => void
  dataSource: 'google' | 'ics' | null
}

export function CalendarFilter({
  shownCalendars,
  hiddenCalendars,
  enabledCalendarIDs,
  showHiddenCalendars,
  onToggleShowHidden,
  onToggleCalendar,
  onImportMoreIcs,
  dataSource,
}: Props) {
  return (
    <aside className="calendar-filter card">
      <h2>Calendars</h2>
      <p className="muted caption">
        Select calendars to include. Shown calendars stay at the top.
      </p>

      <button type="button" className="btn" onClick={onToggleShowHidden}>
        {showHiddenCalendars ? 'Hide hidden calendars' : 'Show hidden calendars'}
      </button>

      {dataSource === 'ics' && onImportMoreIcs && (
        <label className="btn import-more">
          Add ICS…
          <input
            type="file"
            accept=".ics,text/calendar"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) onImportMoreIcs(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      )}

      <div className="calendar-lists">
        {shownCalendars.length > 0 && (
          <CalendarSection
            title="Shown"
            calendars={shownCalendars}
            enabledCalendarIDs={enabledCalendarIDs}
            onToggle={onToggleCalendar}
          />
        )}

        {showHiddenCalendars ? (
          hiddenCalendars.length === 0 ? (
            <p className="muted caption">No hidden calendars</p>
          ) : (
            <CalendarSection
              title="Hidden"
              calendars={hiddenCalendars}
              enabledCalendarIDs={enabledCalendarIDs}
              onToggle={onToggleCalendar}
            />
          )
        ) : (
          shownCalendars.length === 0 && (
            <p className="muted caption">
              No calendars shown. Choose &quot;Show hidden calendars&quot; to pick some.
            </p>
          )
        )}
      </div>
    </aside>
  )
}

function CalendarSection({
  title,
  calendars,
  enabledCalendarIDs,
  onToggle,
}: {
  title: string
  calendars: CalendarCategory[]
  enabledCalendarIDs: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {calendars.map((calendar) => (
          <li key={calendar.id}>
            <label>
              <input
                type="checkbox"
                checked={enabledCalendarIDs.has(calendar.id)}
                onChange={() => onToggle(calendar.id)}
              />
              <span className="color-dot" style={{ background: categoryColor(calendar) }} />
              <span className="cal-text">
                <span className="cal-title">{calendar.title}</span>
                <span className="cal-source muted">{calendar.sourceTitle}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
