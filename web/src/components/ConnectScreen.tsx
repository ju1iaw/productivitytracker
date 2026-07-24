import { useRef } from 'react'

interface Props {
  isGoogleConfigured: boolean
  isLoading: boolean
  error: string | null
  onConnectGoogle: () => void
  onImportIcs: (files: FileList) => void
}

export function ConnectScreen({
  isGoogleConfigured,
  isLoading,
  error,
  onConnectGoogle,
  onImportIcs,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="connect-screen">
      <div className="connect-card card">
        <div className="connect-icon" aria-hidden>
          ▢
        </div>
        <h1>Calendar Access Required</h1>
        <p className="muted">
          Sign in with Google Calendar, or import an ICS export (the path for Apple Calendar /
          iCloud). Timed events are totaled by calendar for Day, Week, and Month.
        </p>

        {error && <p className="error-text">{error}</p>}

        <div className="connect-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!isGoogleConfigured || isLoading}
            onClick={onConnectGoogle}
          >
            {isLoading ? 'Connecting…' : 'Sign in with Google Calendar'}
          </button>

          {!isGoogleConfigured && (
            <p className="hint muted">
              Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>web/.env</code> to enable Google
              sign-in.
            </p>
          )}

          <div className="divider-row">
            <span /> or <span />
          </div>

          <button
            type="button"
            className="btn"
            disabled={isLoading}
            onClick={() => fileRef.current?.click()}
          >
            Import ICS file(s)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".ics,text/calendar"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) onImportIcs(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        <details className="apple-help">
          <summary>Using Apple Calendar?</summary>
          <p className="muted">
            Apple does not offer a public web OAuth Calendar API. Export from Calendar.app:{' '}
            <strong>File → Export → Export…</strong> (or export a single calendar), then import the
            <code>.ics</code> file here. You can also subscribe Apple calendars into Google and use
            Google sign-in.
          </p>
        </details>
      </div>
    </div>
  )
}
