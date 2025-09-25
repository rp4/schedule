import { format, parse, isValid, startOfWeek } from 'date-fns'

/**
 * Parses various date formats into a Date object
 * Supports Excel dates, ISO strings, and common date formats
 */
export function parseFlexibleDate(dateValue: any): Date | null {
  if (!dateValue) return null
  
  // Already a valid Date object
  if (dateValue instanceof Date && isValid(dateValue)) {
    return dateValue
  }
  
  // Excel date number (days since 1900-01-01, with Excel's leap year bug)
  if (typeof dateValue === 'number' && dateValue > 0) {
    // Excel dates: number of days since 1900-01-01 (with leap year bug for 1900)
    const excelEpoch = new Date(1900, 0, 1)
    const msPerDay = 24 * 60 * 60 * 1000
    // Subtract 2 to account for Excel's leap year bug (1900 not a leap year) and 0-indexing
    const date = new Date(excelEpoch.getTime() + (dateValue - 2) * msPerDay)
    if (isValid(date)) return date
  }
  
  // String date
  if (typeof dateValue === 'string') {
    const dateStr = dateValue.trim()
    
    // Try parsing as ISO date
    const isoDate = new Date(dateStr)
    if (isValid(isoDate)) {
      return isoDate
    }
    
    // Try common date formats
    const formats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'M/d/yyyy',
      'dd/MM/yyyy',
      'd/M/yyyy',
      'MMM d yyyy',
      'd-MMM-yyyy',
      'yyyy/MM/dd',
      'dd-MM-yyyy',
      'MM-dd-yyyy'
    ]
    
    for (const fmt of formats) {
      try {
        const parsed = parse(dateStr, fmt, new Date())
        if (isValid(parsed)) {
          return parsed
        }
      } catch {
        // Continue to next format
      }
    }
  }
  
  return null
}

/**
 * Formats a date consistently as yyyy-MM-dd
 */
export function formatDate(date: Date | string | number): string {
  const parsed = typeof date === 'string' || typeof date === 'number' 
    ? parseFlexibleDate(date) 
    : date
    
  if (!parsed || !isValid(parsed)) {
    return format(new Date(), 'yyyy-MM-dd')
  }
  
  return format(parsed, 'yyyy-MM-dd')
}

/**
 * Gets the Monday of the week for a given date
 */
export function getMondayOfWeek(date: Date | string | number): Date {
  const parsed = typeof date === 'string' || typeof date === 'number'
    ? parseFlexibleDate(date)
    : date
    
  if (!parsed || !isValid(parsed)) {
    return startOfWeek(new Date(), { weekStartsOn: 1 })
  }
  
  return startOfWeek(parsed, { weekStartsOn: 1 })
}

/**
 * Gets week identifier in format "YYYY-WW"
 */
export function getWeekIdentifier(date: Date | string | number): string {
  const monday = getMondayOfWeek(date)
  return format(monday, "yyyy-'W'II")
}

/**
 * Normalizes a date to Monday of its week and returns both date and week strings
 */
export function normalizeDateToWeek(dateValue: any): { date: string; week: string } {
  const parsed = parseFlexibleDate(dateValue)
  
  if (!parsed) {
    // Fallback to current week
    const now = new Date()
    const monday = getMondayOfWeek(now)
    return {
      date: formatDate(monday),
      week: getWeekIdentifier(monday)
    }
  }
  
  const monday = getMondayOfWeek(parsed)
  return {
    date: formatDate(monday),
    week: getWeekIdentifier(monday)
  }
}

/**
 * Checks if a date string is in a valid format
 */
export function isValidDateString(dateStr: string): boolean {
  const parsed = parseFlexibleDate(dateStr)
  return parsed !== null && isValid(parsed)
}

/**
 * Compares two dates for equality (ignoring time)
 */
export function areSameDay(date1: Date | string | number, date2: Date | string | number): boolean {
  const d1 = parseFlexibleDate(date1)
  const d2 = parseFlexibleDate(date2)
  
  if (!d1 || !d2) return false
  
  return formatDate(d1) === formatDate(d2)
}

/**
 * Gets the number of days between two dates
 */
export function daysBetween(startDate: Date | string | number, endDate: Date | string | number): number {
  const start = parseFlexibleDate(startDate)
  const end = parseFlexibleDate(endDate)
  
  if (!start || !end) return 0
  
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((end.getTime() - start.getTime()) / msPerDay)
}