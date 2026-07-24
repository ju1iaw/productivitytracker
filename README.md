# Productivity Tracker

A native macOS app that reads your Apple Calendar (including iCloud calendars) via EventKit and totals time spent in each calendar — treated as a category — for day, week, and month views.

There is also a **web version** in [`web/`](web/) (React + Vite) with Google Calendar sign-in and ICS import (for Apple Calendar exports). See [web/README.md](web/README.md).

## Requirements

- macOS 14.0 or later
- Xcode 16+ (or current Xcode with macOS 14 SDK)
- Signed into iCloud Calendar in **System Settings → Apple ID → iCloud → Calendars**, and calendars visible in the Calendar app

## Features

- Full calendar access through EventKit (local, iCloud, and other accounts synced into Calendar.app)
- Each calendar is one category
- Day / Week / Month totals with previous / next / Today navigation
- Horizontal bar chart and ranked list with duration and percent of total
- Per-calendar filter (e.g. hide Holidays)
- Live refresh when Calendar.app changes events

### Duration rules

- Timed events count toward totals
- All-day events are excluded
- Events spanning period boundaries are clipped to the selected range
- Overlapping events both count (no de-overlapping)

## Build & run

```bash
open ProductivityTracker.xcodeproj
```

Or from the terminal:

```bash
xcodebuild -project ProductivityTracker.xcodeproj -scheme ProductivityTracker -configuration Debug build
```

Then run the app from Xcode (**Product → Run**), or open the built `.app` under DerivedData / Build products.

On first launch, grant **Calendar** access when prompted. If you previously denied it, enable access in **System Settings → Privacy & Security → Calendars**.

## Project layout

```
ProductivityTracker/
  ProductivityTrackerApp.swift
  Models/          # CalendarCategory, TimedEvent, PeriodTotals
  Services/        # CalendarSyncService (EventKit), TimeAggregator
  Views/           # SwiftUI UI + TrackerViewModel
  Info.plist       # Calendar usage descriptions
  ProductivityTracker.entitlements  # App Sandbox + Calendars
```

## Privacy

All calendar data stays on your Mac. There is no network sync, account login, or remote backend in this app.
