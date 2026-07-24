import type { CalendarCategory, DateRange, TimedEvent } from '../types/models'
import { parseHexColor } from './colors'

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
const GIS_SRC = 'https://accounts.google.com/gsi/client'

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: (error: { type?: string; message?: string }) => void
          }) => TokenClient
          revoke: (token: string, done: () => void) => void
        }
      }
    }
  }
}

interface TokenResponse {
  access_token?: string
  error?: string
  error_description?: string
  expires_in?: number
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

let gisLoadPromise: Promise<void> | null = null

export function getGoogleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
}

export function isGoogleConfigured(): boolean {
  return getGoogleClientId().length > 0
}

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisLoadPromise) return gisLoadPromise

  gisLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')))
      if (window.google?.accounts?.oauth2) resolve()
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })

  return gisLoadPromise
}

export async function requestGoogleAccessToken(promptConsent = false): Promise<string> {
  const clientId = getGoogleClientId()
  if (!clientId) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID. Add it to web/.env and restart the dev server.')
  }

  await loadGis()
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) throw new Error('Google Identity Services unavailable')

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: CALENDAR_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'Google sign-in failed'))
          return
        }
        resolve(response.access_token)
      },
      error_callback: (error) => {
        reject(new Error(error.message || error.type || 'Google sign-in cancelled'))
      },
    })
    client.requestAccessToken({ prompt: promptConsent ? 'consent' : '' })
  })
}

export function revokeGoogleToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.google?.accounts?.oauth2) {
      resolve()
      return
    }
    window.google.accounts.oauth2.revoke(token, () => resolve())
  })
}

async function googleFetch<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Calendar API error (${res.status}): ${body || res.statusText}`)
  }
  return res.json() as Promise<T>
}

interface GoogleCalendarListEntry {
  id?: string
  summary?: string
  backgroundColor?: string
  foregroundColor?: string
  primary?: boolean
  accessRole?: string
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarListEntry[]
  nextPageToken?: string
}

interface GoogleEvent {
  id?: string
  summary?: string
  status?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

interface GoogleEventsResponse {
  items?: GoogleEvent[]
  nextPageToken?: string
}

export async function fetchGoogleCalendars(token: string): Promise<CalendarCategory[]> {
  const calendars: CalendarCategory[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      minAccessRole: 'reader',
      showHidden: 'true',
      maxResults: '250',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const data = await googleFetch<GoogleCalendarListResponse>(
      token,
      `https://www.googleapis.com/calendar/v3/users/me/calendarList?${params}`,
    )

    for (const item of data.items ?? []) {
      if (!item.id) continue
      const color = parseHexColor(item.backgroundColor)
      calendars.push({
        id: item.id,
        title: item.summary || 'Untitled',
        ...color,
        sourceTitle: item.primary ? 'Google · Primary' : 'Google Calendar',
      })
    }

    pageToken = data.nextPageToken
  } while (pageToken)

  calendars.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  return calendars
}

export async function fetchGoogleEvents(
  token: string,
  calendarIDs: string[],
  range: DateRange,
): Promise<TimedEvent[]> {
  if (calendarIDs.length === 0) return []

  const events: TimedEvent[] = []
  const timeMin = range.start.toISOString()
  const timeMax = range.end.toISOString()

  await Promise.all(
    calendarIDs.map(async (calendarID) => {
      let pageToken: string | undefined
      do {
        const params = new URLSearchParams({
          timeMin,
          timeMax,
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '2500',
        })
        if (pageToken) params.set('pageToken', pageToken)

        const encodedId = encodeURIComponent(calendarID)
        const data = await googleFetch<GoogleEventsResponse>(
          token,
          `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events?${params}`,
        )

        for (const item of data.items ?? []) {
          if (item.status === 'cancelled') continue
          const mapped = mapGoogleEvent(item, calendarID)
          if (mapped) events.push(mapped)
        }

        pageToken = data.nextPageToken
      } while (pageToken)
    }),
  )

  return events
}

function mapGoogleEvent(item: GoogleEvent, calendarID: string): TimedEvent | null {
  const startRaw = item.start?.dateTime ?? item.start?.date
  const endRaw = item.end?.dateTime ?? item.end?.date
  if (!startRaw || !endRaw) return null

  const isAllDay = Boolean(item.start?.date && !item.start?.dateTime)
  const startDate = parseGoogleDate(startRaw, isAllDay, false)
  const endDate = parseGoogleDate(endRaw, isAllDay, true)
  if (!startDate || !endDate) return null

  return {
    id: item.id ?? `${calendarID}-${startRaw}-${endRaw}`,
    title: item.summary || 'Untitled',
    startDate,
    endDate,
    isAllDay,
    calendarID,
  }
}

function parseGoogleDate(value: string, isAllDay: boolean, isEnd: boolean): Date | null {
  if (isAllDay) {
    // All-day dates are YYYY-MM-DD in the calendar's timezone; treat as local midnight.
    const [y, m, d] = value.split('-').map(Number)
    if (!y || !m || !d) return null
    const date = new Date(y, m - 1, d)
    // Google exclusive end date for all-day — keep as-is for clipping; we skip all-day anyway.
    if (isEnd) return date
    return date
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
