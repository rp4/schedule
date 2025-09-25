'use client'

import React, { useMemo, useRef, useCallback, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useScheduleStore } from '@/store/useScheduleStore'
import { format, startOfWeek } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { generateId } from '@/lib/utils'

interface VirtualizedHoursGridProps {
  weeks: Date[]
  viewMode: 'employee' | 'project'
}

export const VirtualizedHoursGrid = React.memo(function VirtualizedHoursGrid({
  weeks,
  viewMode
}: VirtualizedHoursGridProps) {
  const employees = useScheduleStore((state) => state.employees)
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)
  const updateAssignment = useScheduleStore((state) => state.updateAssignment)
  const addAssignment = useScheduleStore((state) => state.addAssignment)
  const removeAssignment = useScheduleStore((state) => state.removeAssignment)
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const parentRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Filter data by team
  const filteredData = useMemo(() => {
    if (selectedTeam === 'All Teams') {
      return { employees, projects, assignments }
    }
    
    const teamEmployees = employees.filter(e => e.team === selectedTeam)
    const teamEmployeeIds = new Set(teamEmployees.map(e => e.id))
    
    const projectsWithTeamMembers = new Set<string>()
    assignments.forEach(a => {
      const employee = employees.find(e => e.id === a.employeeId || e.name === a.employeeId)
      if (employee && teamEmployeeIds.has(employee.id)) {
        projectsWithTeamMembers.add(a.projectId)
        const project = projects.find(p => p.id === a.projectId || p.name === a.projectId)
        if (project) {
          projectsWithTeamMembers.add(project.id)
        }
      }
    })
    
    const teamProjects = projects.filter(p => 
      projectsWithTeamMembers.has(p.id) || projectsWithTeamMembers.has(p.name)
    )
    
    return {
      employees: teamEmployees,
      projects: teamProjects,
      assignments
    }
  }, [employees, projects, assignments, selectedTeam])
  
  // Prepare rows data
  const rows = useMemo(() => {
    if (viewMode === 'employee') {
      return filteredData.employees.map(emp => ({
        id: emp.id,
        type: 'employee' as const,
        name: emp.name,
        team: emp.team,
        data: emp
      }))
    } else {
      return filteredData.projects.map(proj => ({
        id: proj.id,
        type: 'project' as const,
        name: proj.name,
        data: proj
      }))
    }
  }, [viewMode, filteredData])
  
  // Format week for display
  const formatWeek = useCallback((date: Date) => {
    return format(date, 'MMM d').toUpperCase()
  }, [])
  
  // Format week to yyyy-MM-dd for data lookup
  const formatWeekToDate = useCallback((date: Date) => {
    const monday = startOfWeek(date, { weekStartsOn: 1 })
    return format(monday, 'yyyy-MM-dd')
  }, [])
  
  // Get assignment for a specific cell
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getAssignment = useCallback((entityId: string, weekDate: Date) => {
    const dateStr = formatWeekToDate(weekDate)
    const weekStr = formatWeek(weekDate)
    
    return filteredData.assignments.find(a => {
      const entityMatch = viewMode === 'employee' 
        ? (a.employeeId === entityId)
        : (a.projectId === entityId)
      
      const dateMatch = a.date === dateStr || (!a.date && a.week === weekStr)
      return entityMatch && dateMatch
    })
  }, [filteredData.assignments, viewMode, formatWeekToDate, formatWeek])
  
  // Calculate week totals for an entity
  const getWeekTotal = useCallback((entityId: string, weekDate: Date) => {
    const dateStr = formatWeekToDate(weekDate)
    const weekStr = formatWeek(weekDate)
    
    return filteredData.assignments
      .filter(a => {
        const entityMatch = viewMode === 'employee'
          ? (a.employeeId === entityId)
          : (a.projectId === entityId)
        const dateMatch = a.date === dateStr || (!a.date && a.week === weekStr)
        return entityMatch && dateMatch
      })
      .reduce((sum, a) => sum + a.hours, 0)
  }, [filteredData.assignments, viewMode, formatWeekToDate, formatWeek])
  
  // Handle hours change
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleHoursChange = useCallback((entityId: string, otherEntityId: string, weekDate: Date, hours: number) => {
    const dateStr = formatWeekToDate(weekDate)
    const weekStr = formatWeek(weekDate)
    
    const existing = filteredData.assignments.find(a => {
      if (viewMode === 'employee') {
        return a.employeeId === entityId && a.projectId === otherEntityId &&
               (a.date === dateStr || (!a.date && a.week === weekStr))
      } else {
        return a.projectId === entityId && a.employeeId === otherEntityId &&
               (a.date === dateStr || (!a.date && a.week === weekStr))
      }
    })
    
    if (existing) {
      if (hours === 0) {
        removeAssignment(existing.id)
      } else {
        updateAssignment(existing.id, { hours, date: dateStr })
      }
    } else if (hours > 0) {
      addAssignment({
        id: generateId(),
        employeeId: viewMode === 'employee' ? entityId : otherEntityId,
        projectId: viewMode === 'employee' ? otherEntityId : entityId,
        week: weekStr,
        date: dateStr,
        hours
      })
    }
  }, [filteredData.assignments, viewMode, formatWeekToDate, formatWeek, updateAssignment, addAssignment, removeAssignment])
  
  // Virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Estimated row height
    overscan: 5
  })
  
  // Virtualizer for columns (weeks)
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: weeks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 80, // Estimated column width
    overscan: 3
  })
  
  return (
    <div className="relative">
      {/* Fixed header */}
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="flex">
          <div className="w-64 shrink-0 p-3 border-r font-semibold bg-gray-50">
            {viewMode === 'employee' ? 'Employee' : 'Project'}
          </div>
          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            <div style={{ width: `${columnVirtualizer.getTotalSize()}px` }} className="flex">
              {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
                const week = weeks[virtualColumn.index]
                const isCurrentWeek = format(week, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                
                return (
                  <div
                    key={virtualColumn.key}
                    className={`border-r p-2 text-center text-sm ${isCurrentWeek ? 'bg-blue-50' : 'bg-gray-50'}`}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      transform: `translateX(${virtualColumn.start}px)`,
                      width: `${virtualColumn.size}px`,
                      height: '100%'
                    }}
                  >
                    <div className="font-medium">{format(week, 'MMM')}</div>
                    <div className="text-xs">{format(week, 'd')}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Scrollable content */}
      <div
        ref={parentRef}
        className="overflow-y-auto"
        style={{ height: '600px' }} // Fixed height for virtual scrolling
      >
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]
            const isExpanded = expandedRows.has(row.id)
            const total = weeks.reduce((sum, week) => sum + getWeekTotal(row.id, week), 0)
            
            return (
              <div
                key={virtualRow.key}
                className="absolute left-0 right-0 flex border-b hover:bg-gray-50"
                style={{
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`
                }}
              >
                {/* Entity name column */}
                <div className="w-64 shrink-0 p-3 border-r flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedRows)
                      if (isExpanded) {
                        newExpanded.delete(row.id)
                      } else {
                        newExpanded.add(row.id)
                      }
                      setExpandedRows(newExpanded)
                    }}
                    className="p-0.5"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <span className="font-medium">{row.name}</span>
                  {viewMode === 'employee' && row.type === 'employee' && (
                    <span className="text-xs text-gray-500">({row.team})</span>
                  )}
                  <span className="ml-auto text-sm font-semibold">{total}h</span>
                </div>
                
                {/* Week columns */}
                <div className="flex-1 overflow-x-hidden">
                  <div style={{ width: `${columnVirtualizer.getTotalSize()}px` }} className="flex relative">
                    {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
                      const week = weeks[virtualColumn.index]
                      const weekTotal = getWeekTotal(row.id, week)
                      const isOvertime = viewMode === 'employee' && 
                                        row.type === 'employee' && 
                                        weekTotal > (row.data as any).maxHours
                      
                      return (
                        <div
                          key={virtualColumn.key}
                          className={`border-r p-2 text-center ${
                            isOvertime ? 'bg-red-50' : weekTotal > 0 ? 'bg-green-50' : ''
                          }`}
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            transform: `translateX(${virtualColumn.start}px)`,
                            width: `${virtualColumn.size}px`,
                            height: '100%'
                          }}
                        >
                          <div className={`font-medium ${isOvertime ? 'text-red-600' : ''}`}>
                            {weekTotal || '-'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Scroll sync between header and content */}
      <div 
        className="absolute top-0 right-0 pointer-events-none"
        style={{ 
          width: '17px', 
          height: '48px',
          background: 'white',
          borderLeft: '1px solid #e5e7eb'
        }}
      />
    </div>
  )
})