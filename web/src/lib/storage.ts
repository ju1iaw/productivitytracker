const KEYS = {
  shownCalendarOrder: 'pt.shownCalendarOrder',
  focusCalendarID: 'pt.focusCalendarID',
  googleToken: 'pt.googleToken',
  dataSource: 'pt.dataSource',
} as const

export function loadShownCalendarOrder(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.shownCalendarOrder)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function saveShownCalendarOrder(order: string[]): void {
  localStorage.setItem(KEYS.shownCalendarOrder, JSON.stringify(order))
}

export function loadFocusCalendarID(): string | null {
  return localStorage.getItem(KEYS.focusCalendarID)
}

export function saveFocusCalendarID(id: string | null): void {
  if (id) localStorage.setItem(KEYS.focusCalendarID, id)
  else localStorage.removeItem(KEYS.focusCalendarID)
}

export function loadGoogleToken(): string | null {
  return sessionStorage.getItem(KEYS.googleToken)
}

export function saveGoogleToken(token: string | null): void {
  if (token) sessionStorage.setItem(KEYS.googleToken, token)
  else sessionStorage.removeItem(KEYS.googleToken)
}

export function clearSession(): void {
  sessionStorage.removeItem(KEYS.googleToken)
}
