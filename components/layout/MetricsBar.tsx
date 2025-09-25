'use client'

import React, { useMemo } from 'react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { calculateMetrics } from '@/lib/metrics'
import { initializeIncrementalMetrics, getIncrementalMetrics } from '@/lib/metrics/incrementalMetrics'
import { Clock } from 'lucide-react'
import { isWithinInterval } from 'date-fns'
import { useRouter, usePathname } from 'next/navigation'

// Memoized component to prevent unnecessary re-renders
export const MetricsBar = React.memo(function MetricsBar() {
  const employees = useScheduleStore((state) => state.employees)
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const dateRange = useScheduleStore((state) => state.dateRange)
  const setOvertimeSortTrigger = useScheduleStore((state) => state.setOvertimeSortTrigger)
  const setUtilizationSortTrigger = useScheduleStore((state) => state.setUtilizationSortTrigger)
  const router = useRouter()
  const pathname = usePathname()

  // Filter assignments based on date range
  const filteredAssignments = useMemo(() => {
    if (!dateRange) return assignments
    
    // Ensure dates are Date objects (they might be strings from localStorage)
    const filterStart = dateRange.start instanceof Date 
      ? dateRange.start 
      : new Date(dateRange.start)
    const filterEnd = dateRange.end instanceof Date
      ? dateRange.end
      : new Date(dateRange.end)
    
    return assignments.filter(assignment => {
      // Parse the week or date to a Date object
      const assignmentDate = assignment.date 
        ? new Date(assignment.date)
        : assignment.week 
          ? new Date(assignment.week)
          : null
          
      if (!assignmentDate) return true
      
      return isWithinInterval(assignmentDate, {
        start: filterStart,
        end: filterEnd
      })
    })
  }, [assignments, dateRange])

  // Calculate metrics with incremental updates for better performance
  const metrics = useMemo(() => {
    // Use incremental metrics for large datasets, fallback to regular calculation for small ones
    const USE_INCREMENTAL_THRESHOLD = 500 // Use incremental if > 500 assignments
    
    if (filteredAssignments.length > USE_INCREMENTAL_THRESHOLD) {
      // Initialize incremental calculator if needed
      initializeIncrementalMetrics(employees, projects, filteredAssignments)
      return getIncrementalMetrics()
    } else {
      // Use regular calculation for small datasets
      return calculateMetrics(employees, projects, filteredAssignments, dateRange)
    }
  }, [employees, projects, filteredAssignments, dateRange])

  const handleOvertimeClick = () => {
    // Navigate to schedule page with hours view
    if (pathname.includes('/schedule')) {
      // Already on schedule page, just change the view
      window.location.hash = 'view=hours'
      // Trigger sort after navigation
      setTimeout(() => setOvertimeSortTrigger(), 100)
    } else {
      // Navigate to schedule page with hours view
      router.push('/schedule#view=hours')
      // Trigger sort after navigation and component mount
      setTimeout(() => setOvertimeSortTrigger(), 200)
    }
  }

  const handleSkillsClick = () => {
    // Navigate to schedule page with skills view and project subview
    if (pathname.includes('/schedule')) {
      // Already on schedule page, just change the view
      window.location.hash = 'view=skills&subview=project'
    } else {
      // Navigate to schedule page with skills view and project subview
      router.push('/schedule#view=skills&subview=project')
    }
  }

  const handleUtilizationClick = () => {
    // Navigate to schedule page with hours view
    if (pathname.includes('/schedule')) {
      // Already on schedule page, just change the view
      window.location.hash = 'view=hours'
      // Trigger sort after navigation
      setTimeout(() => setUtilizationSortTrigger(), 100)
    } else {
      // Navigate to schedule page with hours view
      router.push('/schedule#view=hours')
      // Trigger sort after navigation and component mount
      setTimeout(() => setUtilizationSortTrigger(), 200)
    }
  }

  return (
    <div className="bg-white shadow-sm border-b border-green-100">
      <div className="container mx-auto px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Overtime Hours - Yellow Card Theme */}
          <div 
            onClick={handleOvertimeClick}
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-yellow-50 to-yellow-100/50 rounded-xl hover-lift cursor-pointer transition-all duration-200 relative">
            <div className="p-2.5 rounded-lg shadow-sm">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-900">
                {metrics.overtimeHours}
              </div>
              <div className="text-sm text-yellow-700 font-medium">Overtime Hours</div>
            </div>
          </div>

          {/* Resource Utilization */}
          <div 
            onClick={handleUtilizationClick}
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl hover-lift cursor-pointer transition-all duration-200">
            <div className="p-2.5 rounded-lg">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {metrics.resourceUtilization}%
              </div>
              <div className="text-sm text-blue-700 font-medium">Resource Utilization</div>
            </div>
          </div>

          {/* Skills Matching - Trophy Target */}
          <div 
            onClick={handleSkillsClick}
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl hover-lift cursor-pointer transition-all duration-200 relative">
            <div className="p-2.5 rounded-lg shadow-sm">
              <span className="text-xl">🏆</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-900">
                {(metrics as any).skillsMatching || 0}
              </div>
              <div className="text-sm text-amber-700 font-medium">Skills Matching</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})