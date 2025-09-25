import { Employee, Project } from '@/types/schedule'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validates employee data from Excel
 */
export function validateEmployee(employee: any, index: number): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required fields
  if (!employee.id && !employee.ID && !employee.Name && !employee.name) {
    errors.push(`Row ${index + 2}: Employee must have an ID or Name`)
  }
  
  // Validate max hours
  const maxHours = employee['Max Hours'] || employee.maxHours || employee['max hours']
  if (maxHours !== undefined) {
    const hours = Number(maxHours)
    if (isNaN(hours) || hours < 0) {
      errors.push(`Row ${index + 2}: Invalid max hours value: ${maxHours}`)
    } else if (hours > 80) {
      warnings.push(`Row ${index + 2}: Unusually high max hours: ${hours}`)
    }
  }
  
  // Validate email format if provided
  const email = employee.Email || employee.email
  if (email && !isValidEmail(email)) {
    warnings.push(`Row ${index + 2}: Invalid email format: ${email}`)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates project data from Excel
 */
export function validateProject(project: any, index: number): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required fields
  if (!project.id && !project.ID && !project.Name && !project.name) {
    errors.push(`Row ${index + 2}: Project must have an ID or Name`)
  }
  
  // Validate dates
  const startDate = project['Start Date'] || project.startDate || project['start date']
  const endDate = project['End Date'] || project.endDate || project['end date']
  
  if (!startDate) {
    errors.push(`Row ${index + 2}: Project missing start date`)
  }
  
  if (!endDate) {
    errors.push(`Row ${index + 2}: Project missing end date`)
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime())) {
      errors.push(`Row ${index + 2}: Invalid start date format: ${startDate}`)
    }
    
    if (isNaN(end.getTime())) {
      errors.push(`Row ${index + 2}: Invalid end date format: ${endDate}`)
    }
    
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start > end) {
      errors.push(`Row ${index + 2}: Start date is after end date`)
    }
    
    // Warn about projects longer than 2 years
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      if (durationDays > 730) {
        warnings.push(`Row ${index + 2}: Project duration exceeds 2 years`)
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates assignment data from Excel
 */
export function validateAssignment(assignment: any, index: number, employees: Employee[], projects: Project[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check employee reference
  const employeeRef = assignment['Employee ID'] || assignment.Employee || assignment.employee || assignment.employeeId
  // Allow blank employee for placeholder assignments
  if (employeeRef) {
    // Check if this is a placeholder assignment
    const isPlaceholder = employeeRef === 'Placeholder' ||
                         (typeof employeeRef === 'string' && employeeRef.startsWith('Placeholder '))

    if (!isPlaceholder) {
      // Verify employee exists (only for non-placeholder assignments)
      const employeeExists = employees.some(e =>
        e.id === employeeRef || e.name === employeeRef
      )
      if (!employeeExists) {
        errors.push(`Row ${index + 2}: Employee not found: ${employeeRef}`)
      }
    }
  }
  
  // Check project reference
  const projectRef = assignment['Project ID'] || assignment.Project || assignment.project || assignment.projectId
  if (!projectRef) {
    errors.push(`Row ${index + 2}: Assignment missing project reference`)
  } else {
    // Verify project exists
    const projectExists = projects.some(p => 
      p.id === projectRef || p.name === projectRef
    )
    if (!projectExists) {
      errors.push(`Row ${index + 2}: Project not found: ${projectRef}`)
    }
  }
  
  // Validate hours
  const hours = assignment.Hours || assignment.hours
  if (hours !== undefined && hours !== null && hours !== '') {
    const hoursNum = Number(hours)
    if (isNaN(hoursNum) || hoursNum < 0) {
      errors.push(`Row ${index + 2}: Invalid hours value: ${hours}`)
    } else if (hoursNum > 60) {
      warnings.push(`Row ${index + 2}: Unusually high hours for single assignment: ${hoursNum}`)
    }
  }
  
  // Check for date/week
  const hasDate = assignment.Week || assignment.Date || assignment.week || assignment.date
  if (!hasDate) {
    warnings.push(`Row ${index + 2}: Assignment missing date/week`)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates the entire Excel data structure
 */
export function validateExcelData(data: {
  employees: any[]
  projects: any[]
  assignments: any[]
}): ValidationResult {
  const allErrors: string[] = []
  const allWarnings: string[] = []
  
  // Check for required sheets
  if (!data.employees || data.employees.length === 0) {
    allErrors.push('No employees found in the Excel file')
  }
  
  if (!data.projects || data.projects.length === 0) {
    allErrors.push('No projects found in the Excel file')
  }
  
  // Validate individual records
  if (data.employees) {
    data.employees.forEach((emp, i) => {
      const result = validateEmployee(emp, i)
      allErrors.push(...result.errors)
      allWarnings.push(...result.warnings)
    })
  }
  
  if (data.projects) {
    data.projects.forEach((proj, i) => {
      const result = validateProject(proj, i)
      allErrors.push(...result.errors)
      allWarnings.push(...result.warnings)
    })
  }
  
  // Only validate assignments if we have valid employees and projects
  if (data.assignments && data.employees && data.projects) {
    // Convert to typed arrays for validation
    const typedEmployees = data.employees as Employee[]
    const typedProjects = data.projects as Project[]
    
    data.assignments.forEach((assign, i) => {
      const result = validateAssignment(assign, i, typedEmployees, typedProjects)
      allErrors.push(...result.errors)
      allWarnings.push(...result.warnings)
    })
  }
  
  // Check for duplicate employee IDs
  if (data.employees) {
    const employeeIds = data.employees
      .map(e => e.id || e.ID || e.name || e.Name)
      .filter(Boolean)
    const duplicates = findDuplicates(employeeIds)
    if (duplicates.length > 0) {
      allWarnings.push(`Duplicate employee IDs found: ${duplicates.join(', ')}`)
    }
  }
  
  // Check for duplicate project IDs
  if (data.projects) {
    const projectIds = data.projects
      .map(p => p.id || p.ID || p.name || p.Name)
      .filter(Boolean)
    const duplicates = findDuplicates(projectIds)
    if (duplicates.length > 0) {
      allWarnings.push(`Duplicate project IDs found: ${duplicates.join(', ')}`)
    }
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  }
}

/**
 * Helper function to validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Helper function to find duplicates in an array
 */
function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  
  arr.forEach(item => {
    if (seen.has(item)) {
      duplicates.add(item)
    }
    seen.add(item)
  })
  
  return Array.from(duplicates)
}