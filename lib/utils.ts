import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return `id_${Math.random().toString(36).substr(2, 9)}`
}

export function formatDate(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

export function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null
  if (dateValue instanceof Date) return dateValue
  if (typeof dateValue === 'number') {
    // Excel date serial number
    return new Date((dateValue - 25569) * 86400 * 1000)
  }
  return new Date(dateValue)
}

export function getCurrentWeek(): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(monday.getDate() + mondayOffset)
  
  return monday.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() + ' ' + monday.getDate()
}