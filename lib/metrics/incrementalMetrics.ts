import { Employee, Project, Assignment } from '@/types/schedule'

/**
 * Incremental metrics calculator that only recalculates affected parts
 * when data changes, improving performance for large datasets
 */

interface MetricsCache {
  overtimeByEmployee: Map<string, Map<string, number>> // employeeId -> week -> overtime hours
  utilizationByEmployee: Map<string, number> // employeeId -> utilization %
  skillsMatchByProject: Map<string, number> // projectId -> average skills match
  lastCalculated: number
  isDirty: boolean
}

interface DirtyTracking {
  dirtyEmployees: Set<string>
  dirtyProjects: Set<string>
  dirtyWeeks: Set<string>
}

class IncrementalMetricsCalculator {
  private cache: MetricsCache = {
    overtimeByEmployee: new Map(),
    utilizationByEmployee: new Map(),
    skillsMatchByProject: new Map(),
    lastCalculated: 0,
    isDirty: true
  }
  
  private dirtyTracking: DirtyTracking = {
    dirtyEmployees: new Set(),
    dirtyProjects: new Set(),
    dirtyWeeks: new Set()
  }
  
  private employees: Map<string, Employee> = new Map()
  private projects: Map<string, Project> = new Map()
  private assignments: Map<string, Assignment> = new Map()
  private assignmentsByEmployee: Map<string, Set<string>> = new Map()
  private assignmentsByProject: Map<string, Set<string>> = new Map()
  
  /**
   * Initialize with full dataset
   */
  initialize(
    employees: Employee[],
    projects: Project[],
    assignments: Assignment[]
  ) {
    // Clear everything
    this.cache = {
      overtimeByEmployee: new Map(),
      utilizationByEmployee: new Map(),
      skillsMatchByProject: new Map(),
      lastCalculated: Date.now(),
      isDirty: false
    }
    
    // Build lookup maps
    this.employees.clear()
    this.projects.clear()
    this.assignments.clear()
    this.assignmentsByEmployee.clear()
    this.assignmentsByProject.clear()
    
    employees.forEach(e => this.employees.set(e.id, e))
    projects.forEach(p => this.projects.set(p.id, p))
    
    assignments.forEach(a => {
      this.assignments.set(a.id, a)
      
      // Track by employee
      if (!this.assignmentsByEmployee.has(a.employeeId)) {
        this.assignmentsByEmployee.set(a.employeeId, new Set())
      }
      this.assignmentsByEmployee.get(a.employeeId)!.add(a.id)
      
      // Track by project
      const projectId = a.projectId
      if (!this.assignmentsByProject.has(projectId)) {
        this.assignmentsByProject.set(projectId, new Set())
      }
      this.assignmentsByProject.get(projectId)!.add(a.id)
    })
    
    // Initial full calculation
    this.calculateAll()
  }
  
  /**
   * Update a single assignment (incremental)
   */
  updateAssignment(assignmentId: string, updates: Partial<Assignment>) {
    const existing = this.assignments.get(assignmentId)
    if (!existing) return
    
    // Mark affected entities as dirty
    this.dirtyTracking.dirtyEmployees.add(existing.employeeId)
    if (updates.employeeId && updates.employeeId !== existing.employeeId) {
      this.dirtyTracking.dirtyEmployees.add(updates.employeeId)
    }
    
    this.dirtyTracking.dirtyProjects.add(existing.projectId)
    if (updates.projectId && updates.projectId !== existing.projectId) {
      this.dirtyTracking.dirtyProjects.add(updates.projectId)
    }
    
    const week = existing.week || existing.date || ''
    this.dirtyTracking.dirtyWeeks.add(week)
    if (updates.week) {
      this.dirtyTracking.dirtyWeeks.add(updates.week)
    }
    
    // Update the assignment
    const updated = { ...existing, ...updates }
    this.assignments.set(assignmentId, updated)
    
    // Update index maps if employee or project changed
    if (updates.employeeId && updates.employeeId !== existing.employeeId) {
      this.assignmentsByEmployee.get(existing.employeeId)?.delete(assignmentId)
      if (!this.assignmentsByEmployee.has(updates.employeeId)) {
        this.assignmentsByEmployee.set(updates.employeeId, new Set())
      }
      this.assignmentsByEmployee.get(updates.employeeId)!.add(assignmentId)
    }
    
    if (updates.projectId && updates.projectId !== existing.projectId) {
      this.assignmentsByProject.get(existing.projectId)?.delete(assignmentId)
      if (!this.assignmentsByProject.has(updates.projectId)) {
        this.assignmentsByProject.set(updates.projectId, new Set())
      }
      this.assignmentsByProject.get(updates.projectId)!.add(assignmentId)
    }
    
    this.cache.isDirty = true
  }
  
  /**
   * Add a new assignment (incremental)
   */
  addAssignment(assignment: Assignment) {
    this.assignments.set(assignment.id, assignment)
    
    // Update indexes
    if (!this.assignmentsByEmployee.has(assignment.employeeId)) {
      this.assignmentsByEmployee.set(assignment.employeeId, new Set())
    }
    this.assignmentsByEmployee.get(assignment.employeeId)!.add(assignment.id)
    
    if (!this.assignmentsByProject.has(assignment.projectId)) {
      this.assignmentsByProject.set(assignment.projectId, new Set())
    }
    this.assignmentsByProject.get(assignment.projectId)!.add(assignment.id)
    
    // Mark as dirty
    this.dirtyTracking.dirtyEmployees.add(assignment.employeeId)
    this.dirtyTracking.dirtyProjects.add(assignment.projectId)
    this.dirtyTracking.dirtyWeeks.add(assignment.week || assignment.date || '')
    
    this.cache.isDirty = true
  }
  
  /**
   * Remove an assignment (incremental)
   */
  removeAssignment(assignmentId: string) {
    const assignment = this.assignments.get(assignmentId)
    if (!assignment) return
    
    // Mark as dirty
    this.dirtyTracking.dirtyEmployees.add(assignment.employeeId)
    this.dirtyTracking.dirtyProjects.add(assignment.projectId)
    this.dirtyTracking.dirtyWeeks.add(assignment.week || assignment.date || '')
    
    // Remove from indexes
    this.assignmentsByEmployee.get(assignment.employeeId)?.delete(assignmentId)
    this.assignmentsByProject.get(assignment.projectId)?.delete(assignmentId)
    
    // Remove assignment
    this.assignments.delete(assignmentId)
    
    this.cache.isDirty = true
  }
  
  /**
   * Get current metrics (uses cache if clean, recalculates dirty parts if needed)
   */
  getMetrics() {
    if (this.cache.isDirty) {
      this.recalculateDirty()
    }
    
    return this.aggregateMetrics()
  }
  
  /**
   * Force full recalculation
   */
  private calculateAll() {
    // Calculate overtime for all employees
    this.employees.forEach(employee => {
      this.calculateEmployeeOvertime(employee.id)
      this.calculateEmployeeUtilization(employee.id)
    })
    
    // Calculate skills match for all projects
    this.projects.forEach(project => {
      this.calculateProjectSkillsMatch(project.id)
    })
    
    this.cache.isDirty = false
    this.cache.lastCalculated = Date.now()
    this.clearDirtyTracking()
  }
  
  /**
   * Recalculate only dirty parts
   */
  private recalculateDirty() {
    // Recalculate for dirty employees
    this.dirtyTracking.dirtyEmployees.forEach(employeeId => {
      this.calculateEmployeeOvertime(employeeId)
      this.calculateEmployeeUtilization(employeeId)
    })
    
    // Recalculate for dirty projects
    this.dirtyTracking.dirtyProjects.forEach(projectId => {
      this.calculateProjectSkillsMatch(projectId)
    })
    
    this.cache.isDirty = false
    this.cache.lastCalculated = Date.now()
    this.clearDirtyTracking()
  }
  
  /**
   * Calculate overtime for a specific employee
   */
  private calculateEmployeeOvertime(employeeId: string) {
    const employee = this.employees.get(employeeId)
    if (!employee) return
    
    const weeklyHours = new Map<string, number>()
    const assignmentIds = this.assignmentsByEmployee.get(employeeId) || new Set()
    
    assignmentIds.forEach(assignmentId => {
      const assignment = this.assignments.get(assignmentId)
      if (assignment) {
        const week = assignment.week || assignment.date || ''
        weeklyHours.set(week, (weeklyHours.get(week) || 0) + assignment.hours)
      }
    })
    
    const overtimeByWeek = new Map<string, number>()
    weeklyHours.forEach((hours, week) => {
      const overtime = Math.max(0, hours - employee.maxHours)
      if (overtime > 0) {
        overtimeByWeek.set(week, overtime)
      }
    })
    
    this.cache.overtimeByEmployee.set(employeeId, overtimeByWeek)
  }
  
  /**
   * Calculate utilization for a specific employee
   */
  private calculateEmployeeUtilization(employeeId: string) {
    const employee = this.employees.get(employeeId)
    if (!employee) return
    
    const assignmentIds = this.assignmentsByEmployee.get(employeeId) || new Set()
    let totalHours = 0
    const weeksWorked = new Set<string>()
    
    assignmentIds.forEach(assignmentId => {
      const assignment = this.assignments.get(assignmentId)
      if (assignment) {
        totalHours += assignment.hours
        weeksWorked.add(assignment.week || assignment.date || '')
      }
    })
    
    const maxCapacity = employee.maxHours * Math.max(1, weeksWorked.size)
    const utilization = maxCapacity > 0 ? (totalHours / maxCapacity) * 100 : 0
    
    this.cache.utilizationByEmployee.set(employeeId, Math.min(100, utilization))
  }
  
  /**
   * Calculate skills match for a specific project
   */
  private calculateProjectSkillsMatch(projectId: string) {
    const project = this.projects.get(projectId)
    if (!project || !project.requiredSkills || project.requiredSkills.length === 0) {
      this.cache.skillsMatchByProject.set(projectId, 100)
      return
    }
    
    const assignmentIds = this.assignmentsByProject.get(projectId) || new Set()
    const employeesOnProject = new Set<string>()
    
    assignmentIds.forEach(assignmentId => {
      const assignment = this.assignments.get(assignmentId)
      if (assignment) {
        employeesOnProject.add(assignment.employeeId)
      }
    })
    
    if (employeesOnProject.size === 0) {
      this.cache.skillsMatchByProject.set(projectId, 0)
      return
    }
    
    let totalMatch = 0
    employeesOnProject.forEach(employeeId => {
      const employee = this.employees.get(employeeId)
      if (employee) {
        const match = this.calculateSkillsMatch(employee, project)
        totalMatch += match
      }
    })
    
    const averageMatch = (totalMatch / employeesOnProject.size) * 100
    this.cache.skillsMatchByProject.set(projectId, averageMatch)
  }
  
  /**
   * Calculate skills match between employee and project
   */
  private calculateSkillsMatch(employee: Employee, project: Project): number {
    if (!project.requiredSkills || project.requiredSkills.length === 0) {
      return 1.0
    }
    
    if (!employee.skills || Object.keys(employee.skills).length === 0) {
      return 0.0
    }
    
    let weightedScore = 0
    
    for (const requiredSkill of project.requiredSkills) {
      const proficiency = employee.skills[requiredSkill]
      if (proficiency) {
        const weight = proficiency === 'Expert' ? 1.0 : 
                       proficiency === 'Intermediate' ? 0.7 : 0.4
        weightedScore += weight
      }
    }
    
    return project.requiredSkills.length > 0 
      ? weightedScore / project.requiredSkills.length 
      : 0
  }
  
  /**
   * Aggregate cached metrics into final result
   */
  private aggregateMetrics() {
    let totalOvertime = 0
    this.cache.overtimeByEmployee.forEach(weekMap => {
      weekMap.forEach(hours => {
        totalOvertime += hours
      })
    })
    
    let totalUtilization = 0
    let employeeCount = 0
    this.cache.utilizationByEmployee.forEach(utilization => {
      totalUtilization += utilization
      employeeCount++
    })
    
    let totalSkillsMatch = 0
    let projectCount = 0
    this.cache.skillsMatchByProject.forEach(match => {
      totalSkillsMatch += match
      projectCount++
    })
    
    return {
      overtimeHours: Math.round(totalOvertime),
      resourceUtilization: employeeCount > 0 ? Math.round(totalUtilization / employeeCount) : 0,
      skillsMatching: projectCount > 0 ? Math.round(totalSkillsMatch / projectCount) : 0
    }
  }
  
  /**
   * Clear dirty tracking
   */
  private clearDirtyTracking() {
    this.dirtyTracking.dirtyEmployees.clear()
    this.dirtyTracking.dirtyProjects.clear()
    this.dirtyTracking.dirtyWeeks.clear()
  }
}

// Singleton instance
let metricsCalculator: IncrementalMetricsCalculator | null = null

/**
 * Get or create the incremental metrics calculator instance
 */
export function getIncrementalMetricsCalculator(): IncrementalMetricsCalculator {
  if (!metricsCalculator) {
    metricsCalculator = new IncrementalMetricsCalculator()
  }
  return metricsCalculator
}

/**
 * Initialize incremental metrics with full dataset
 */
export function initializeIncrementalMetrics(
  employees: Employee[],
  projects: Project[],
  assignments: Assignment[]
) {
  const calculator = getIncrementalMetricsCalculator()
  calculator.initialize(employees, projects, assignments)
}

/**
 * Update metrics incrementally when an assignment changes
 */
export function updateMetricsForAssignment(
  assignmentId: string,
  updates: Partial<Assignment>
) {
  const calculator = getIncrementalMetricsCalculator()
  calculator.updateAssignment(assignmentId, updates)
}

/**
 * Add new assignment and update metrics incrementally
 */
export function addAssignmentToMetrics(assignment: Assignment) {
  const calculator = getIncrementalMetricsCalculator()
  calculator.addAssignment(assignment)
}

/**
 * Remove assignment and update metrics incrementally
 */
export function removeAssignmentFromMetrics(assignmentId: string) {
  const calculator = getIncrementalMetricsCalculator()
  calculator.removeAssignment(assignmentId)
}

/**
 * Get current metrics (uses cache when possible)
 */
export function getIncrementalMetrics() {
  const calculator = getIncrementalMetricsCalculator()
  return calculator.getMetrics()
}