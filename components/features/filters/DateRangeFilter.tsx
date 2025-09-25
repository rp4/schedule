'use client'

import { Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'
import { format, startOfYear, endOfYear, addYears } from 'date-fns'
import { useScheduleStore } from '@/store/useScheduleStore'

export function DateRangeFilter() {
  const dateRange = useScheduleStore((state) => state.dateRange)
  const setDateRange = useScheduleStore((state) => state.setDateRange)
  const projects = useScheduleStore((state) => state.projects)
  
  // Helper to parse dates properly to avoid timezone issues
  const parseProjectDate = (dateValue: any): Date => {
    if (dateValue instanceof Date) return dateValue
    const dateStr = String(dateValue)
    // For YYYY-MM-DD format, parse as local date not UTC
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day) // month is 0-indexed
    }
    return new Date(dateValue)
  }
  
  // Calculate default date range based on actual project dates
  const getDefaultDateRange = () => {
    if (projects.length === 0) {
      // Fallback to current year if no projects
      const now = new Date()
      return {
        start: startOfYear(now),
        end: endOfYear(now)
      }
    }
    
    // Find earliest start date and latest end date from all projects
    let earliestStart = parseProjectDate(projects[0].startDate)
    let latestEnd = parseProjectDate(projects[0].endDate)
    
    projects.forEach(project => {
      const projectStart = parseProjectDate(project.startDate)
      const projectEnd = parseProjectDate(project.endDate)
      
      if (projectStart < earliestStart) {
        earliestStart = projectStart
      }
      if (projectEnd > latestEnd) {
        latestEnd = projectEnd
      }
    })
    
    return {
      start: earliestStart,
      end: latestEnd
    }
  }
  
  const defaultRange = getDefaultDateRange()
  
  // Calculate min and max dates based on projects or fallback to 5 year range
  const [minDate, maxDate] = (() => {
    if (projects.length === 0) {
      const now = new Date()
      return [
        startOfYear(addYears(now, -2)),
        endOfYear(addYears(now, 2))
      ]
    }
    
    // Use project-based range with some padding
    const range = getDefaultDateRange()
    return [
      startOfYear(addYears(range.start, -1)),
      endOfYear(addYears(range.end, 1))
    ]
  })()
  
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Initialize with default range on mount
  useEffect(() => {
    if (!dateRange && projects.length > 0) {
      // Set the default range
      setDateRange({
        start: defaultRange.start,
        end: defaultRange.end
      })
    }
  }, [projects.length])
  
  useEffect(() => {
    if (dateRange) {
      // Ensure dates are Date objects (they might be strings from localStorage)
      const start = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start)
      const end = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end)
      setStartDate(format(start, 'yyyy-MM-dd'))
      setEndDate(format(end, 'yyyy-MM-dd'))
    } else if (projects.length > 0) {
      setStartDate(format(defaultRange.start, 'yyyy-MM-dd'))
      setEndDate(format(defaultRange.end, 'yyyy-MM-dd'))
    }
  }, [dateRange, defaultRange.start, defaultRange.end, projects.length])
  
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value
    setStartDate(newStartDate)
    
    if (newStartDate && endDate) {
      // Parse dates as local dates to avoid timezone issues
      const [startYear, startMonth, startDay] = newStartDate.split('-').map(Number)
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number)
      setDateRange({
        start: new Date(startYear, startMonth - 1, startDay),
        end: new Date(endYear, endMonth - 1, endDay)
      })
    }
  }
  
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value
    setEndDate(newEndDate)
    
    if (startDate && newEndDate) {
      // Parse dates as local dates to avoid timezone issues
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
      const [endYear, endMonth, endDay] = newEndDate.split('-').map(Number)
      setDateRange({
        start: new Date(startYear, startMonth - 1, startDay),
        end: new Date(endYear, endMonth - 1, endDay)
      })
    }
  }
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <label htmlFor="start-date" className="text-sm font-medium text-gray-700">
          From:
        </label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          min={format(minDate, 'yyyy-MM-dd')}
          max={endDate || format(maxDate, 'yyyy-MM-dd')}
          className="input-sm"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <label htmlFor="end-date" className="text-sm font-medium text-gray-700">
          To:
        </label>
        <input
          id="end-date"
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          min={startDate || format(minDate, 'yyyy-MM-dd')}
          max={format(maxDate, 'yyyy-MM-dd')}
          className="input-sm"
        />
      </div>
    </div>
  )
}