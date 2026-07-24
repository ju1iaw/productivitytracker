declare module 'ical.js' {
  namespace ICAL {
    function parse(input: string): unknown

    class Component {
      constructor(jCal: unknown)
      getFirstPropertyValue(name: string): unknown
      getAllSubcomponents(name: string): Component[]
    }

    class Time {
      isDate: boolean
      static fromJSDate(date: Date, useUTC: boolean): Time
      compare(other: Time): number
      toJSDate(): Date
      toICALString(): string
    }

    class Event {
      constructor(component: Component)
      uid: string
      summary: string | null
      startDate: Time
      endDate: Time
      isRecurring(): boolean
      iterator(startTime?: Time): {
        next(): Time | null
      }
      getOccurrenceDetails(occurrenceTime: Time): {
        item: Event
        startDate: Time
        endDate: Time
      }
    }
  }

  export default ICAL
}
