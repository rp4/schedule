import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import debounce from 'lodash.debounce'
import type { ScheduleData, Employee, Project, Assignment, DateRange } from '@/types/schedule'
import { 
  initializeIncrementalMetrics, 
  updateMetricsForAssignment,
  addAssignmentToMetrics,
  removeAssignmentFromMetrics 
} from '@/lib/metrics/incrementalMetrics'

interface ScheduleState extends ScheduleData {
  selectedTeam: string
  dateRange: DateRange | null
  hasHydrated: boolean
  overtimeSortTrigger: number
  utilizationSortTrigger: number
  
  // Actions
  loadData: (data: ScheduleData) => void
  setSelectedTeam: (team: string) => void
  setDateRange: (range: DateRange | null) => void
  updateEmployee: (id: string, data: Partial<Employee>) => void
  updateProject: (id: string, data: Partial<Project>) => void
  addProject: (project: Omit<Project, 'id'>) => void
  deleteProject: (id: string) => void
  updateAssignment: (id: string, data: Partial<Assignment>) => void
  addAssignment: (assignment: Assignment) => void
  removeAssignment: (id: string) => void
  clearData: () => void
  setHasHydrated: (state: boolean) => void
  setOvertimeSortTrigger: () => void
  setUtilizationSortTrigger: () => void
}

const initialState: ScheduleData = {
  employees: [],
  projects: [],
  assignments: [],
  skills: [],
  teams: ['All Teams'],
}

// Create a debounced version of localStorage setItem
const debouncedSetItem = debounce((key: string, value: string) => {
  // Check if we're in the browser
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(key, value)
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}, 500) // 500ms debounce delay

// Custom storage object with debouncing
const customStorage = {
  getItem: (name: string) => {
    // Check if we're in the browser
    if (typeof window === 'undefined') return null

    try {
      const str = localStorage.getItem(name)
      if (!str) return null
      return JSON.parse(str)
    } catch (error) {
      console.error('Failed to read from localStorage:', error)
      return null
    }
  },
  setItem: (name: string, value: any) => {
    // Check if we're in the browser
    if (typeof window === 'undefined') return

    try {
      // Use debounced version for setting
      debouncedSetItem(name, JSON.stringify(value))
    } catch (error) {
      console.error('Failed to write to localStorage:', error)
    }
  },
  removeItem: (name: string) => {
    // Check if we're in the browser
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(name)
    } catch (error) {
      console.error('Failed to remove from localStorage:', error)
    }
  },
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      ...initialState,
      selectedTeam: 'All Teams',
      dateRange: null,
      hasHydrated: false,
      overtimeSortTrigger: 0,
      utilizationSortTrigger: 0,

      loadData: (data) => {
        // Initialize incremental metrics with the loaded data
        if (data.assignments.length > 500) {
          initializeIncrementalMetrics(data.employees, data.projects, data.assignments)
        }
        
        return set(() => ({
          ...data,
          teams: ['All Teams', ...Array.from(new Set(data.employees.map(e => e.team).filter((t): t is string => Boolean(t))))],
          // Reset date range when loading new data so it recalculates based on new project dates
          dateRange: null,
        }))
      },

      setSelectedTeam: (team) => set({ selectedTeam: team }),
      
      setDateRange: (range) => set({ dateRange: range }),

      updateEmployee: (id, data) => set((state) => ({
        employees: state.employees.map(e => 
          e.id === id ? { ...e, ...data } : e
        ),
      })),

      updateProject: (id, data) => set((state) => {
        const oldProject = state.projects.find(p => p.id === id)
        
        if (!oldProject) {
          return {
            projects: state.projects.map(p => 
              p.id === id ? { ...p, ...data } : p
            ),
          }
        }
        
        // Check if dates are being changed
        const datesChanged = (data.startDate && data.startDate !== oldProject.startDate) || 
                           (data.endDate && data.endDate !== oldProject.endDate)
        
        if (datesChanged) {
          const oldStartDate = new Date(oldProject.startDate)
          const newStartDate = data.startDate ? new Date(data.startDate) : oldStartDate
          const newEndDate = data.endDate ? new Date(data.endDate) : new Date(oldProject.endDate)
          
          // Calculate the week shift if start date changed
          const msPerWeek = 7 * 24 * 60 * 60 * 1000
          const weekDifference = data.startDate ? 
            Math.round((newStartDate.getTime() - oldStartDate.getTime()) / msPerWeek) : 0
          
          // Update assignments for this project
          const updatedAssignments = state.assignments.map(a => {
            // Check if assignment belongs to this project
            if (a.projectId === id || a.projectId === oldProject.name) {
              let assignmentDate: Date | null = null
              let newAssignment = { ...a }
              
              // First, shift the assignment date if project moved
              if (weekDifference !== 0) {
                if (a.date) {
                  assignmentDate = new Date(a.date)
                  const shiftedDate = new Date(assignmentDate.getTime() + (weekDifference * msPerWeek))
                  const newDateStr = shiftedDate.toISOString().split('T')[0]
                  const newWeekStr = shiftedDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  }).toUpperCase()
                  
                  newAssignment = { ...newAssignment, date: newDateStr, week: newWeekStr }
                  assignmentDate = shiftedDate
                } else {
                  // For older data without date field, try to parse week string
                  const currentYear = new Date().getFullYear()
                  const monthMap: Record<string, number> = {
                    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
                    'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
                  }
                  
                  const parts = a.week.split(' ')
                  if (parts.length === 2) {
                    const month = monthMap[parts[0]]
                    const day = parseInt(parts[1])
                    
                    if (!isNaN(month) && !isNaN(day)) {
                      const oldDate = new Date(currentYear, month, day)
                      const projectYear = new Date(oldProject.startDate).getFullYear()
                      if (Math.abs(currentYear - projectYear) > 1) {
                        oldDate.setFullYear(projectYear)
                      }
                      
                      const shiftedDate = new Date(oldDate.getTime() + (weekDifference * msPerWeek))
                      const newDateStr = shiftedDate.toISOString().split('T')[0]
                      const newWeekStr = shiftedDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      }).toUpperCase()
                      
                      newAssignment = { ...newAssignment, date: newDateStr, week: newWeekStr }
                      assignmentDate = shiftedDate
                    }
                  }
                }
              } else {
                // No shift, just get the current assignment date
                if (newAssignment.date) {
                  assignmentDate = new Date(newAssignment.date)
                }
              }
              
              // Now check if the assignment date is within the new project range
              // If not, set hours to 0
              if (assignmentDate) {
                // Add 6 days to get the end of the week (assignments are for full weeks)
                const weekEnd = new Date(assignmentDate.getTime() + (6 * 24 * 60 * 60 * 1000))
                
                // Check if the assignment week is outside the new project date range
                if (assignmentDate > newEndDate || weekEnd < newStartDate) {
                  // Assignment is completely outside project range - zero out hours
                  newAssignment = { ...newAssignment, hours: 0 }
                }
              }
              
              return newAssignment
            }
            return a
          })
          
          return {
            projects: state.projects.map(p => 
              p.id === id ? { ...p, ...data } : p
            ),
            assignments: updatedAssignments
          }
        }
        
        // If no date change, just update the project
        return {
          projects: state.projects.map(p => 
            p.id === id ? { ...p, ...data } : p
          ),
        }
      }),

      addProject: (project) => set((state) => {
        // Generate a unique ID for the new project
        const newId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newProject: Project = {
          ...project,
          id: newId
        }
        return {
          projects: [...state.projects, newProject]
        }
      }),

      deleteProject: (id) => set((state) => {
        // Remove the project
        const updatedProjects = state.projects.filter(p => p.id !== id)
        
        // Remove all assignments associated with this project
        const updatedAssignments = state.assignments.filter(a => {
          // Check both projectId and project name for backwards compatibility
          const project = state.projects.find(p => p.id === id)
          return a.projectId !== id && (!project || a.projectId !== project.name)
        })
        
        // Update incremental metrics if using them
        if (state.assignments.length > 500) {
          // Remove assignments from metrics
          state.assignments
            .filter(a => {
              const project = state.projects.find(p => p.id === id)
              return a.projectId === id || (project && a.projectId === project.name)
            })
            .forEach(a => {
              if (a.id) {
                removeAssignmentFromMetrics(a.id)
              }
            })
        }
        
        return {
          projects: updatedProjects,
          assignments: updatedAssignments
        }
      }),

      updateAssignment: (id, data) => {
        // Update incremental metrics if using them
        get().assignments.length > 500 && updateMetricsForAssignment(id, data)
        
        return set((state) => ({
          assignments: state.assignments.map(a => 
            a.id === id ? { ...a, ...data } : a
          ),
        }))
      },

      addAssignment: (assignment) => {
        // Update incremental metrics if using them
        get().assignments.length > 500 && addAssignmentToMetrics(assignment)
        
        return set((state) => ({
          assignments: [...state.assignments, assignment],
        }))
      },

      removeAssignment: (id) => {
        // Update incremental metrics if using them
        get().assignments.length > 500 && removeAssignmentFromMetrics(id)
        
        return set((state) => ({
          assignments: state.assignments.filter(a => a.id !== id),
        }))
      },

      clearData: () => set(initialState),
      
      setHasHydrated: (state) => set({ hasHydrated: state }),
      
      setOvertimeSortTrigger: () => set((state) => ({ 
        overtimeSortTrigger: state.overtimeSortTrigger + 1,
        utilizationSortTrigger: 0  // Reset utilization trigger
      })),
      
      setUtilizationSortTrigger: () => set((state) => ({ 
        utilizationSortTrigger: state.utilizationSortTrigger + 1,
        overtimeSortTrigger: 0  // Reset overtime trigger
      })),
    }),
    {
      name: 'schedule-storage',
      storage: customStorage, // Use our debounced storage
      partialize: (state) => ({
        employees: state.employees,
        projects: state.projects,
        assignments: state.assignments,
        skills: state.skills,
        teams: state.teams,
        selectedTeam: state.selectedTeam,
        dateRange: state.dateRange,
      }),
      onRehydrateStorage: () => (state) => {
        // Helper to parse date strings as local dates to avoid timezone issues
        const parseLocalDate = (dateValue: any): Date => {
          if (dateValue instanceof Date) return dateValue
          const dateStr = String(dateValue)
          // For YYYY-MM-DD format, parse as local date not UTC
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateStr.split('-').map(Number)
            return new Date(year, month - 1, day) // month is 0-indexed
          }
          return new Date(dateValue)
        }
        
        // Convert date strings back to Date objects after rehydration
        if (state?.dateRange) {
          state.dateRange = {
            start: parseLocalDate((state.dateRange as any).start || (state.dateRange as any).startDate),
            end: parseLocalDate((state.dateRange as any).end || (state.dateRange as any).endDate)
          }
        }
        
        // Convert project dates back to Date objects
        if (state?.projects) {
          state.projects = state.projects.map(project => ({
            ...project,
            startDate: parseLocalDate(project.startDate),
            endDate: parseLocalDate(project.endDate)
          }))
        }
        
        state?.setHasHydrated(true)
      },
    }
  )
)