export interface Employee {
  id: string
  name: string
  email?: string
  maxHours: number
  team?: string
  skills: Record<string, ProficiencyLevel>
}

export interface Project {
  id: string
  name: string
  startDate: Date
  endDate: Date
  requiredSkills?: string[]
  portfolio?: string
  color?: string
  budgetHours?: number
}

export interface Assignment {
  id: string
  employeeId: string
  projectId: string
  hours: number
  week: string
  date: string // yyyy-MM-dd format for precise date tracking
}

export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Expert'

export interface ScheduleData {
  employees: Employee[]
  projects: Project[]
  assignments: Assignment[]
  skills: string[]
  teams: string[]
}

export interface DateRange {
  start: Date
  end: Date
}

export interface Metrics {
  overtimeHours: number
  resourceUtilization: number
  skillsMatching: number
  projectCoverage: number
}