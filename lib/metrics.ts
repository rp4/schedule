import { Employee, Project, Assignment, ProficiencyLevel, DateRange } from '@/types/schedule'
import { differenceInWeeks } from 'date-fns'

// Pre-compute proficiency scores for performance
const PROFICIENCY_SCORES: Record<ProficiencyLevel, number> = {
  'Beginner': 1,
  'Intermediate': 2,
  'Expert': 3
}

/**
 * Fast resource utilization calculation accounting for time periods.
 * Formula: (Total Assigned Hours / Total Max Capacity) * 100
 * 
 * @example
 * // John with maxHours=40, assigned 10hrs week1 + 50hrs week2
 * // Result: (60 / 80) * 100 = 75%
 * 
 * @param employees - Array of employees with maxHours
 * @param assignments - Array of assignments with hours and time periods
 * @param dateRange - Optional date range to calculate periods from. If not provided, uses assignment periods
 * @returns Resource utilization percentage (0-100)
 */
export function calculateResourceUtilization(
  employees: Employee[],
  assignments: Assignment[],
  dateRange?: DateRange | null
): number {
  // Early exit for empty data
  if (!employees.length) return 0
  
  let numPeriods: number
  
  if (dateRange?.start && dateRange?.end) {
    // Calculate number of weeks between start and end dates
    const start = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start)
    const end = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end)
    
    // Add 1 to include both start and end weeks
    numPeriods = Math.max(1, differenceInWeeks(end, start) + 1)
  } else {
    // Fallback to old behavior: count unique periods from assignments
    const timePeriodsSet = new Set<string>()
    for (const assignment of assignments) {
      const timeKey = assignment.date || assignment.week
      timePeriodsSet.add(timeKey)
    }
    numPeriods = Math.max(1, timePeriodsSet.size)
  }
  
  // Track employee hours
  const employeeAssignedHours = new Map<string, number>()
  
  // Sum hours per employee
  for (const assignment of assignments) {
    employeeAssignedHours.set(
      assignment.employeeId,
      (employeeAssignedHours.get(assignment.employeeId) || 0) + assignment.hours
    )
  }
  
  // Calculate total capacity: sum(employee.maxHours) * numPeriods
  let totalMaxCapacity = 0
  let totalAssignedHours = 0
  
  for (const employee of employees) {
    totalMaxCapacity += employee.maxHours * numPeriods
    totalAssignedHours += employeeAssignedHours.get(employee.id) || 0
  }
  
  // Return percentage (0-100)
  return totalMaxCapacity > 0 
    ? Math.round((totalAssignedHours / totalMaxCapacity) * 100)
    : 0
}

export function calculateMetrics(
  employees: Employee[],
  projects: Project[],
  assignments: Assignment[],
  dateRange?: DateRange | null
) {
  let overtimeHours = 0
  
  // Pre-compute lookups for performance
  const employeeMap = new Map<string, Employee>()
  const projectMap = new Map<string, Project>()
  
  employees.forEach(emp => employeeMap.set(emp.id, emp))
  projects.forEach(proj => projectMap.set(proj.id, proj))

  // Calculate overtime per time period (week)
  // Structure: employeeId -> timeperiod -> hours
  const employeeHoursByPeriod = new Map<string, Map<string, number>>()
  
  assignments.forEach(assignment => {
    const period = assignment.date || assignment.week
    
    if (!employeeHoursByPeriod.has(assignment.employeeId)) {
      employeeHoursByPeriod.set(assignment.employeeId, new Map())
    }
    
    const periodMap = employeeHoursByPeriod.get(assignment.employeeId)!
    const currentHours = periodMap.get(period) || 0
    periodMap.set(period, currentHours + assignment.hours)
  })

  // Calculate overtime for each employee per period
  employees.forEach(employee => {
    const periodHours = employeeHoursByPeriod.get(employee.id)
    if (periodHours) {
      // Check each period separately
      periodHours.forEach((hours) => {
        if (hours > employee.maxHours) {
          overtimeHours += hours - employee.maxHours
        }
      })
    }
  })

  // Use optimized utilization calculation with date range
  const resourceUtilization = calculateResourceUtilization(employees, assignments, dateRange)

  // Calculate skills matching using optimized function
  const skillsMatching = calculateSkillsMatch(assignments, employeeMap, projectMap)

  return {
    overtimeHours: Math.round(overtimeHours),
    resourceUtilization,
    skillsMatching: Math.round(skillsMatching),
  }
}

/**
 * Optimized skills matching calculation for use in optimization algorithms.
 * Returns total skill points based on employee proficiency levels matching project requirements.
 * 
 * Scoring: Beginner = 1 point, Intermediate = 2 points, Expert = 3 points
 * Each unique employee-project pair is counted only once, regardless of how many weeks they're assigned.
 * 
 * @param assignments - Array of assignments to evaluate
 * @param employeeMap - Pre-computed map of employee ID to Employee for O(1) lookup
 * @param projectMap - Pre-computed map of project ID to Project for O(1) lookup
 * @returns Total skill matching score
 */
export function calculateSkillsMatch(
  assignments: Assignment[],
  employeeMap: Map<string, Employee>,
  projectMap: Map<string, Project>
): number {
  let totalScore = 0
  
  // Track unique employee-project pairs to avoid counting duplicates
  const uniquePairs = new Set<string>()
  
  // Process each assignment
  for (const assignment of assignments) {
    // Create unique key for this employee-project combination
    const pairKey = `${assignment.employeeId}-${assignment.projectId}`
    
    // Skip if we've already counted this employee-project pair
    if (uniquePairs.has(pairKey)) {
      continue
    }
    
    const employee = employeeMap.get(assignment.employeeId)
    const project = projectMap.get(assignment.projectId)
    
    // Skip if employee or project not found, or no required skills
    if (!employee || !project || !project.requiredSkills || project.requiredSkills.length === 0) {
      continue
    }
    
    // Mark this pair as processed
    uniquePairs.add(pairKey)
    
    // Calculate score for this unique employee-project pair
    for (const skill of project.requiredSkills) {
      const proficiency = employee.skills[skill]
      if (proficiency) {
        totalScore += PROFICIENCY_SCORES[proficiency]
      }
    }
  }
  
  return totalScore
}

/**
 * Pre-compute skill scores for a single employee-project pair.
 * Useful for caching in optimization algorithms.
 * 
 * @param employee - Employee to evaluate
 * @param project - Project to match against
 * @returns Skill score for this pairing
 */
export function getEmployeeProjectSkillScore(
  employee: Employee,
  project: Project
): number {
  if (!project.requiredSkills) return 0
  
  let score = 0
  for (const skill of project.requiredSkills) {
    const proficiency = employee.skills[skill]
    if (proficiency) {
      score += PROFICIENCY_SCORES[proficiency]
    }
  }
  
  return score
}

/**
 * Create a skill score matrix for all employee-project combinations.
 * Useful for pre-computation in optimization algorithms.
 * 
 * @param employees - Array of employees
 * @param projects - Array of projects
 * @returns 2D map of [employeeId][projectId] -> skill score
 */
export function createSkillScoreMatrix(
  employees: Employee[],
  projects: Project[]
): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>()
  
  for (const employee of employees) {
    const projectScores = new Map<string, number>()
    
    for (const project of projects) {
      const score = getEmployeeProjectSkillScore(employee, project)
      if (score > 0) {
        projectScores.set(project.id, score)
      }
    }
    
    if (projectScores.size > 0) {
      matrix.set(employee.id, projectScores)
    }
  }
  
  return matrix
}