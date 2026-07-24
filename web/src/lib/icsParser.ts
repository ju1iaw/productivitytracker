import ICAL from 'ical.js'
import type { CalendarCategory, TimedEvent } from '../types/models'
import { colorFromId } from './colors'

export interface IcsImportResult {
  calendars: CalendarCategory[]
  events: TimedEvent[]
}

/**
 * Parse one or more .ics files. Each file becomes one calendar category
 * (Apple Calendar exports are typically one calendar per file).
 */
export async function parseIcsFiles(files: FileList | File[]): Promise<IcsImportResult> {
  const fileArray = Array.from(files)
  const calendars: CalendarCategory[] = []
  const events: TimedEvent[] = []

  for (const file of fileArray) {
    const text = await file.text()
    const parsed = parseIcsText(text, file.name)
    calendars.push(parsed.calendar)
    events.push(...parsed.events)
  }

  return { calendars, events }
}

function parseIcsText(text: string, fileName: string): {
  calendar: CalendarCategory
  events: TimedEvent[]
} {
  const jcal = ICAL.parse(text)
  const vcalendar = new ICAL.Component(jcal)

  const calName =
    vcalendar.getFirstPropertyValue('x-wr-calname')?.toString() ||
    vcalendar.getFirstPropertyValue('name')?.toString() ||
    fileName.replace(/\.ics$/i, '') ||
    'Imported calendar'

  const calendarID = `ics:${fileName}:${calName}`
  const color = colorFromId(calendarID)

  const calendar: CalendarCategory = {
    id: calendarID,
    title: calName,
    ...color,
    sourceTitle: 'ICS import',
  }

  const vevents = vcalendar.getAllSubcomponents('vevent')
  const events: TimedEvent[] = []

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent)
    if (event.isRecurring()) {
      // Expand a reasonable window around "now" so Day/Week/Month navigation works.
      const expandStart = ICAL.Time.fromJSDate(new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), false)
      const expandEnd = ICAL.Time.fromJSDate(new Date(Date.now() + 400 * 24 * 60 * 60 * 1000), false)
      const iterator = event.iterator()
      let next = iterator.next()
      let count = 0
      while (next && count < 2000) {
        if (next.compare(expandEnd) > 0) break
        if (next.compare(expandStart) >= 0) {
          const occurrence = event.getOccurrenceDetails(next)
          events.push(toTimedEvent(occurrence.item, occurrence.startDate, occurrence.endDate, calendarID, count))
        }
        next = iterator.next()
        count += 1
      }
    } else {
      events.push(toTimedEvent(event, event.startDate, event.endDate, calendarID, 0))
    }
  }

  return { calendar, events }
}

function toTimedEvent(
  event: ICAL.Event,
  start: ICAL.Time,
  end: ICAL.Time,
  calendarID: string,
  occurrenceIndex: number,
): TimedEvent {
  const isAllDay = Boolean(start.isDate)
  return {
    id: `${calendarID}:${event.uid}:${occurrenceIndex}:${start.toICALString()}`,
    title: event.summary || 'Untitled',
    startDate: start.toJSDate(),
    endDate: end.toJSDate(),
    isAllDay,
    calendarID,
  }
}
