'use client'

import React from 'react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { useMemo, useState, useRef, useEffect } from 'react'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import { ProjectForm } from './ProjectForm'
import { ZoomIn, ZoomOut, Calendar } from 'lucide-react'
import type { Project } from '@/types/schedule'
import "gantt-task-react/dist/index.css"

type GanttViewMode = 'week' | 'month' | 'year'

// Memoized component to prevent unnecessary re-renders
export const GanttChart = React.memo(function GanttChart() {
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const employees = useScheduleStore((state) => state.employees)
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)
  const dateRangeFilter = useScheduleStore((state) => state.dateRange)
  const hasHydrated = useScheduleStore((state) => state.hasHydrated)
  const updateProject = useScheduleStore((state) => state.updateProject)
  const addProject = useScheduleStore((state) => state.addProject)
  const deleteProject = useScheduleStore((state) => state.deleteProject)
  
  const [viewMode, setViewMode] = useState<GanttViewMode>('week')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const ganttRef = useRef<any>(null)
  
  // Get the view date - always use current date for initial centering
  const viewDate = useMemo(() => {
    // Always center on current date/week when component mounts
    return new Date()
  }, [])
  
  // Calculate optimal column width based on date range span
  const columnWidth = useMemo(() => {
    if (!dateRangeFilter) {
      // Default widths
      return viewMode === 'week' ? 60 : viewMode === 'month' ? 120 : 200
    }
    
    const filterStart = dateRangeFilter.start instanceof Date 
      ? dateRangeFilter.start 
      : new Date(dateRangeFilter.start)
    const filterEnd = dateRangeFilter.end instanceof Date
      ? dateRangeFilter.end
      : new Date(dateRangeFilter.end)
    
    // Calculate span in days
    const spanInDays = Math.ceil((filterEnd.getTime() - filterStart.getTime()) / (1000 * 60 * 60 * 24))
    
    // Adjust column width to fit the view better
    if (viewMode === 'week') {
      // For week view
      if (spanInDays < 60) return 100
      if (spanInDays < 180) return 80
      return 60
    } else if (viewMode === 'month') {
      // For month view
      if (spanInDays < 365) return 150
      return 120
    } else {
      // Year view
      return 200
    }
  }, [viewMode, dateRangeFilter])
  
  
  // Filter projects by team and date range
  const filteredProjects = useMemo(() => {
    let filtered = projects
    
    // Filter by team - show all projects that team members work on
    if (selectedTeam !== 'All Teams') {
      // Get employees in the selected team
      const teamEmployees = employees.filter(e => e.team === selectedTeam)
      const teamEmployeeIds = new Set(teamEmployees.map(e => e.id))
      
      // Find all projects that have ANY assignments from team members
      const projectsWithTeamMembers = new Set<string>()
      assignments.forEach(a => {
        // Check if this assignment is from a team member (handle both ID and name references)
        const employee = employees.find(e => e.id === a.employeeId || e.name === a.employeeId)
        if (employee && teamEmployeeIds.has(employee.id)) {
          // Add both project ID and name to handle both reference types
          projectsWithTeamMembers.add(a.projectId)
          const project = projects.find(p => p.id === a.projectId || p.name === a.projectId)
          if (project) {
            projectsWithTeamMembers.add(project.id)
          }
        }
      })
      
      // Filter projects that team members work on
      filtered = filtered.filter(p => 
        projectsWithTeamMembers.has(p.id) || projectsWithTeamMembers.has(p.name)
      )
    }
    
    // Filter by date range if specified
    if (dateRangeFilter) {
      // Ensure dates are Date objects (they might be strings from localStorage)
      const filterStart = dateRangeFilter.start instanceof Date 
        ? dateRangeFilter.start 
        : new Date(dateRangeFilter.start)
      const filterEnd = dateRangeFilter.end instanceof Date
        ? dateRangeFilter.end
        : new Date(dateRangeFilter.end)
        
      filtered = filtered.filter(project => {
        const projectStart = new Date(project.startDate)
        const projectEnd = new Date(project.endDate)
        
        // Only show projects that have some portion within the date range
        // Hide projects that are completely outside the range
        return !(projectEnd < filterStart || projectStart > filterEnd)
      })
    }
    
    return filtered
  }, [projects, assignments, employees, selectedTeam, dateRangeFilter])
  
  // Convert projects to Gantt tasks format with boundary markers
  const tasks: Task[] = useMemo(() => {
    // Ensure we have at least one task for the chart to render properly
    if (filteredProjects.length === 0) {
      return []
    }
    
    const projectTasks = filteredProjects.map(project => {
      const projectColor = project.color || '#dbeafe' // Use project color or default light blue
      return {
        start: new Date(project.startDate),
        end: new Date(project.endDate),
        name: project.name,
        id: project.id,
        type: 'task' as const, // Use 'task' instead of 'project' for better dragging
        progress: 0, // No progress bars
        isDisabled: false,
        styles: {
          backgroundColor: projectColor,
          backgroundSelectedColor: projectColor, // Same color when selected
          progressColor: 'transparent', // Hide progress bar
          progressSelectedColor: 'transparent' // Hide progress bar when selected
        }
      }
    })
    
    // Add invisible boundary markers if date range filter is active
    if (dateRangeFilter) {
      const filterStart = dateRangeFilter.start instanceof Date 
        ? dateRangeFilter.start 
        : new Date(dateRangeFilter.start)
      const filterEnd = dateRangeFilter.end instanceof Date
        ? dateRangeFilter.end
        : new Date(dateRangeFilter.end)
      
      // Add boundary markers to constrain the view
      const boundaryTasks: Task[] = [
        {
          start: filterStart,
          end: filterStart,
          name: '',
          id: '__boundary_start__',
          type: 'task' as const,
          progress: 0,
          isDisabled: true,
          styles: {
            backgroundColor: 'transparent',
            backgroundSelectedColor: 'transparent',
            progressColor: 'transparent',
            progressSelectedColor: 'transparent'
          }
        },
        {
          start: filterEnd,
          end: filterEnd,
          name: '',
          id: '__boundary_end__',
          type: 'task' as const,
          progress: 0,
          isDisabled: true,
          styles: {
            backgroundColor: 'transparent',
            backgroundSelectedColor: 'transparent',
            progressColor: 'transparent',
            progressSelectedColor: 'transparent'
          }
        }
      ]
      
      return [...boundaryTasks, ...projectTasks]
    }
    
    return projectTasks
  }, [filteredProjects, dateRangeFilter])
  
  // Handle date changes from drag and drop
  const handleDateChange = (task: Task) => {
    // Ignore boundary markers
    if (task.id.startsWith('__boundary_')) return
    
    updateProject(task.id, {
      startDate: task.start,
      endDate: task.end
    })
  }
  
  // Handle double click to edit project
  const handleDoubleClick = (task: Task) => {
    // Ignore boundary markers
    if (task.id.startsWith('__boundary_')) return
    
    const project = filteredProjects.find(p => p.id === task.id)
    if (project) {
      setEditingProject(project)
      setEditDialogOpen(true)
    }
  }
  
  // Handle project update from edit form
  const handleProjectUpdate = (projectId: string, updates: Partial<Project>) => {
    updateProject(projectId, updates)
    setEditingProject(null)
    setEditDialogOpen(false)
  }
  
  // Convert view mode to gantt-task-react format
  const getGanttViewMode = (): ViewMode => {
    switch (viewMode) {
      case 'week':
        return ViewMode.Week
      case 'month':
        return ViewMode.Month
      case 'year':
        return ViewMode.Year
      default:
        return ViewMode.Week
    }
  }
  
  // Handle zoom controls
  const handleZoomIn = () => {
    const modes: GanttViewMode[] = ['week', 'month', 'year']
    const currentIndex = modes.indexOf(viewMode)
    if (currentIndex > 0) {
      setViewMode(modes[currentIndex - 1])
    }
  }
  
  const handleZoomOut = () => {
    const modes: GanttViewMode[] = ['week', 'month', 'year']
    const currentIndex = modes.indexOf(viewMode)
    if (currentIndex < modes.length - 1) {
      setViewMode(modes[currentIndex + 1])
    }
  }
  
  // Auto-scroll to current week on mount
  useEffect(() => {
    if (ganttRef.current && tasks.length > 0) {
      // Small delay to ensure the chart is fully rendered
      setTimeout(() => {
        const ganttContainer = document.querySelector('.gantt-container')
        if (ganttContainer) {
          // Find the scrollable element
          const scrollableElement = ganttContainer.querySelector('[style*="overflow"]') as HTMLElement
          if (scrollableElement) {
            // Calculate position to center on current date
            // The Gantt library should handle this with viewDate prop
            // Gantt chart centered on current week
          }
        }
      }, 200)
    }
  }, [tasks.length])
  
  // Replace week numbers with dates when in week view
  useEffect(() => {
    if (viewMode === 'week' && ganttRef.current) {
      const observer = new MutationObserver(() => {
        // Find all text elements that contain "W" followed by numbers (week labels)
        const weekLabels = document.querySelectorAll('.gantt-container text')
        weekLabels.forEach(label => {
          const text = label.textContent || ''
          // Match W followed by 1-2 digits (week number)
          if (/^W\d{1,2}$/.test(text)) {
            // Extract week number
            const weekNum = parseInt(text.substring(1))
            // Calculate the date for this week number
            // This is approximate - ideally we'd calculate the actual Monday
            const yearStart = new Date(new Date().getFullYear(), 0, 1)
            const daysToAdd = (weekNum - 1) * 7
            const weekDate = new Date(yearStart)
            weekDate.setDate(yearStart.getDate() + daysToAdd)
            // Find the Monday of that week
            const dayOfWeek = weekDate.getDay()
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
            weekDate.setDate(weekDate.getDate() + daysToMonday)
            // Format as day number with suffix
            const day = weekDate.getDate()
            const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                         day === 2 || day === 22 ? 'nd' :
                         day === 3 || day === 23 ? 'rd' : 'th'
            label.textContent = `${day}${suffix}`
          }
        })
      })
      
      observer.observe(ganttRef.current, {
        childList: true,
        subtree: true,
        characterData: true
      })
      
      return () => observer.disconnect()
    }
  }, [viewMode, tasks])
  
  // Show loading state until hydrated
  if (!hasHydrated) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <Calendar className="w-8 h-8 text-gray-400 animate-pulse" />
        </div>
        <h3 className="text-subheading mb-2">Loading...</h3>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-subheading mb-2">No Projects Yet</h3>
        <p className="text-caption mb-6 max-w-md mx-auto">
          Upload an Excel file or load sample data to start visualizing your project timeline.
        </p>
        <button className="btn-primary">
          Get Started
        </button>
      </div>
    )
  }
  
  return (
    <div>
      {/* Controls Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3">
          {/* Add Project Button */}
          <ProjectForm 
            mode="add" 
            onSubmit={(projectData) => addProject(projectData as any)}
          />
        </div>
        
        <div className="flex gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            <button
              onClick={handleZoomIn}
              disabled={viewMode === 'week'}
              className="btn-icon disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              disabled={viewMode === 'year'}
              className="btn-icon disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 px-3 py-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium capitalize text-gray-700">{viewMode}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Gantt Chart */}
      <div className="gantt-container" ref={ganttRef}>
        <Gantt
          tasks={tasks}
          viewMode={getGanttViewMode()}
          viewDate={viewDate}
          onDateChange={handleDateChange}
          onProgressChange={() => {}} // Disable progress changes
          onDoubleClick={handleDoubleClick} // Enable double click for editing
          onClick={() => {}} // Disable click
          listCellWidth="" // Hide the task list
          columnWidth={columnWidth}
          ganttHeight={Math.max(400, tasks.length * 45 + 100)}
          fontSize="12px"
          rowHeight={40}
          barCornerRadius={4}
          todayColor="rgba(254, 249, 195, 0.8)"
          // Ensure dragging is enabled
          handleWidth={8}
          timeStep={1000 * 60 * 60 * 24} // 1 day steps for dragging
          locale="en-GB" // Use British locale for Monday-first weeks
        />
      </div>
      
      {/* Custom styles to match app theme and hide elements */}
      <style jsx global>{`
        .gantt-container {
          font-family: inherit;
        }
        
        /* Hide the task list completely */
        .gantt-container ._lnNfm {
          display: none !important;
        }
        
        /* Hide the vertical divider between list and chart */
        .gantt-container ._1sNtG {
          display: none !important;
        }
        
        /* Make the chart take full width */
        .gantt-container ._3ZbQT {
          width: 100% !important;
          grid-template-columns: 0 0 1fr !important;
        }
        
        /* Style the chart area */
        .gantt-container .gantt {
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        /* Header styling */
        .gantt-container ._3F-uD {
          background: #f9fafb;
          border-color: #e5e7eb;
        }
        
        /* Calendar header */
        .gantt-container ._1jRuC {
          background: white;
          border-color: #e5e7eb;
        }
        
        /* Month text */
        .gantt-container ._2Odod {
          color: #374151;
          font-weight: 500;
        }
        
        /* Day text */
        .gantt-container ._34SS0 {
          color: #6b7280;
        }
        
        /* Grid lines */
        .gantt-container ._nI1Xw {
          stroke: #e5e7eb;
        }
        
        /* Today line */
        .gantt-container ._2pYPm {
          stroke: #fef3c7;
          stroke-width: 2;
        }
        
        /* Task bars - ensure solid color with rounded corners */
        .gantt-container rect.barBackground {
          rx: 4;
        }

        /* Selected task bars - keep same color as unselected */
        .gantt-container rect.barBackgroundSelected {
          /* Color will be set via inline styles */
        }
        
        /* Hide progress bars */
        .gantt-container rect.barProgress {
          display: none !important;
        }
        
        /* Task labels - force black text with multiple selectors */
        .gantt-container text.barLabel,
        .gantt-container svg text,
        .gantt-container .barWrapper text,
        .gantt-container g.barWrapper text,
        .gantt-container g text,
        .gantt-container text {
          fill: #000000 !important;
          color: #000000 !important;
          font-weight: 700 !important;
        }
        
        /* Specifically target task text */
        .gantt-container svg g rect[class*="bar"] + text {
          fill: #000000 !important;
          font-weight: 700 !important;
        }
        
        /* Resize handles */
        .gantt-container rect.barHandle {
          fill: #1d4ed8;
          opacity: 0;
          cursor: ew-resize;
        }
        
        .gantt-container g.barWrapper:hover rect.barHandle {
          opacity: 0.5;
        }
        
        /* Ensure dragging cursor */
        .gantt-container g.barWrapper {
          cursor: move;
        }
        
        /* Remove any default task list styles that might show */
        .gantt-container div[class*="task-list"] {
          display: none !important;
        }
        
        /* Ensure full width for the SVG container */
        .gantt-container > div > div {
          width: 100% !important;
        }
      `}</style>
      
      {/* Edit Project Dialog */}
      <ProjectForm
        mode="edit"
        project={editingProject}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={(projectData) => {
          if (editingProject && projectData.id) {
            handleProjectUpdate(projectData.id, projectData)
          }
        }}
        onDelete={(projectId) => {
          deleteProject(projectId)
          setEditingProject(null)
          setEditDialogOpen(false)
        }}
      />
    </div>
  )
})