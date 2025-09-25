import * as XLSX from 'xlsx'
import { ScheduleData, Assignment, ProficiencyLevel } from '@/types/schedule'
import { generateId } from '@/lib/utils'
import { normalizeDateToWeek, parseFlexibleDate } from '@/lib/date-utils'
import { validateExcelData } from './validator'


export async function parseExcelFile(file: File): Promise<ScheduleData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        // Only log essential info for debugging
        const DEBUG = false // Set to true for detailed logging
        if (DEBUG) {
          console.log('📊 Starting Excel parsing...', { fileSize: file.size })
        }
        
        if (!e.target?.result) {
          throw new Error('Failed to read file content')
        }
        
        const data = new Uint8Array(e.target.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        
        if (!workbook.Sheets || Object.keys(workbook.Sheets).length === 0) {
          throw new Error('No sheets found in the Excel file')
        }
        
        const result = parseWorkbook(workbook)
        // Only log summary on success
        console.log(`✅ Excel parsed: ${result.employees.length} employees, ${result.projects.length} projects, ${result.assignments.length} assignments`)
        
        // Validate the parsed data
        const validation = validateExcelData({
          employees: result.employees,
          projects: result.projects,
          assignments: result.assignments
        })
        
        if (!validation.isValid) {
          const errorMessage = 'Excel validation failed:\n' + validation.errors.join('\n')
          throw new Error(errorMessage)
        }
        
        // Log warnings if any
        if (validation.warnings.length > 0) {
          console.warn('⚠️ Excel validation warnings:', validation.warnings)
        }
        
        resolve(result)
      } catch (error) {
        console.error('❌ Error parsing Excel:', error)
        if (error instanceof Error) {
          reject(error)
        } else {
          reject(new Error('Unknown error occurred while parsing Excel file'))
        }
      }
    }
    
    reader.onerror = (error) => {
      console.error('❌ FileReader error:', error)
      reject(new Error('Failed to read file. Please try again.'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

function parseWorkbook(workbook: XLSX.WorkBook): ScheduleData {
  const result: ScheduleData = {
    employees: [],
    projects: [],
    assignments: [],
    skills: [],
    teams: ['All Teams'],
  }

  // Parse Employees sheet
  if (workbook.Sheets['Employees']) {
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Employees'])
    result.employees = sheet.map((row: any) => ({
      id: row.ID || row.id || generateId(),
      name: row.Name || row.Employee || '',
      email: row.Email || '',
      maxHours: Number(row['Max Hours']) || 40,
      team: row.Team || 'Default',
      skills: parseSkills(row),
    }))
  }

  // Parse Projects sheet
  if (workbook.Sheets['Projects']) {
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Projects'])
    result.projects = sheet.map((row: any) => ({
      id: row.ID || row.id || generateId(),
      name: row.Name || row.Project || '',
      startDate: parseFlexibleDate(row['Start Date']) || new Date(),
      endDate: parseFlexibleDate(row['End Date']) || new Date(),
      requiredSkills: row['Required Skills']
        ? String(row['Required Skills']).split(',').map(s => s.trim())
        : [],
      portfolio: row.Portfolio || '',
      color: row.Color || undefined,
      budgetHours: row['Budget Hours'] ? Number(row['Budget Hours']) : undefined,
    }))
  }

  // Parse Assignments sheet
  if (workbook.Sheets['Assignments']) {
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Assignments'])
    
    // Check if this is pivot-style format (columns are dates)
    const firstRow = sheet[0] || {}
    const columns = Object.keys(firstRow)
    const dateColumns = columns.filter(col => {
      // Check if column name looks like a date
      return /^\d{4}-\d{2}-\d{2}/.test(col) || 
             /^\d{1,2}\/\d{1,2}\/\d{4}/.test(col) ||
             /^[A-Z][a-z]{2}\s+\d{1,2}/.test(col)
    })
    
    if (dateColumns.length > 0) {
      // Pivot format: Each row is employee-project, columns are week dates
      result.assignments = []
      
      sheet.forEach((row: any, _rowIndex: number) => {
        const employeeIdOrName = row.Employee || row['Employee'] || row['Employee ID'] || ''
        const projectIdOrName = row.Project || row['Project'] || row['Project ID'] || ''

        if (!projectIdOrName) {
          // Skip invalid rows that have no project
          return
        }

        // Try to find employee by ID first, then by name
        let employeeId = employeeIdOrName

        // Check if this is a placeholder assignment:
        // - Empty/blank Employee field
        // - "Placeholder" or strings starting with "Placeholder "
        const isPlaceholder = !employeeIdOrName ||
          employeeIdOrName === 'Placeholder' ||
          employeeIdOrName.startsWith('Placeholder ')

        // If blank, assign a placeholder ID
        if (!employeeIdOrName) {
          employeeId = 'Placeholder'
        }

        if (!isPlaceholder) {
          const employeeById = result.employees.find(e => e.id === employeeIdOrName)
          const employeeByName = result.employees.find(e => e.name === employeeIdOrName)

          if (!employeeById && employeeByName) {
            employeeId = employeeByName.id
          }
        }
        // For placeholders, keep the original name as the employeeId
        
        // Try to find project by ID first, then by name
        let projectId = projectIdOrName
        const projectById = result.projects.find(p => p.id === projectIdOrName)
        const projectByName = result.projects.find(p => p.name === projectIdOrName)
        
        if (!projectById && projectByName) {
          projectId = projectByName.id
        }
        
        // Process each date column
        dateColumns.forEach(dateCol => {
          const hours = row[dateCol]
          if (hours && Number(hours) > 0) {
            const { date, week } = normalizeDateToWeek(dateCol)
            
            const assignment: Assignment = {
              id: generateId(),
              employeeId: employeeId,
              projectId: projectId,
              hours: Number(hours),
              week: week,
              date: date
            }
            
            result.assignments.push(assignment)
          }
        })
      })
    } else {
      // Traditional format: Each row is one assignment
      result.assignments = sheet.map((row: any, _index: number) => {
        // Check all possible column names for week/date
        const rawDate = row.Week || row['Week'] || row.Date || row['Date']
        const { date, week } = normalizeDateToWeek(rawDate)
        
        const rawHours = row.Hours || row['Hours'] || 0
        const parsedHours = Number(rawHours) || 0
        
        const employeeIdOrName = row['Employee ID'] || row.Employee || row['Employee'] || ''
        const projectIdOrName = row['Project ID'] || row.Project || row['Project'] || ''

        // Try to find employee by ID first, then by name
        let employeeId = employeeIdOrName

        // Check if this is a placeholder assignment:
        // - Empty/blank Employee field
        // - "Placeholder" or strings starting with "Placeholder "
        const isPlaceholder = !employeeIdOrName ||
          employeeIdOrName === 'Placeholder' ||
          employeeIdOrName.startsWith('Placeholder ')

        // If blank, assign a placeholder ID
        if (!employeeIdOrName) {
          employeeId = 'Placeholder'
        }

        if (!isPlaceholder) {
          const employeeById = result.employees.find(e => e.id === employeeIdOrName)
          const employeeByName = result.employees.find(e => e.name === employeeIdOrName)

          if (!employeeById && employeeByName) {
            employeeId = employeeByName.id
          }
        }
        // For placeholders, keep the original name as the employeeId
        
        // Try to find project by ID first, then by name
        let projectId = projectIdOrName
        const projectById = result.projects.find(p => p.id === projectIdOrName)
        const projectByName = result.projects.find(p => p.name === projectIdOrName)
        
        if (!projectById && projectByName) {
          projectId = projectByName.id
        }
        
        const assignment: Assignment = {
          id: generateId(),
          employeeId: employeeId,
          projectId: projectId,
          hours: parsedHours,
          week: week,
          date: date
        }
        
        return assignment
      })
    }
  } else {
    // No assignments sheet found
  }

  // Parse Skills sheet (optional)
  if (workbook.Sheets['Skills']) {
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Skills'])
    const skillSet = new Set<string>()
    
    sheet.forEach((row: any) => {
      Object.keys(row).forEach(key => {
        if (key !== 'Employee' && key !== 'ID' && key !== 'Name') {
          skillSet.add(key)
        }
      })
    })
    
    result.skills = Array.from(skillSet)
  } else {
    // Extract skills from employees
    const skillSet = new Set<string>()
    result.employees.forEach(emp => {
      Object.keys(emp.skills).forEach(skill => skillSet.add(skill))
    })
    result.skills = Array.from(skillSet)
  }

  // Extract teams
  const teamSet = new Set(['All Teams'])
  result.employees.forEach(emp => {
    if (emp.team) teamSet.add(emp.team)
  })
  result.teams = Array.from(teamSet)

  return result
}

function parseSkills(row: any): Record<string, ProficiencyLevel> {
  const skills: Record<string, ProficiencyLevel> = {}
  const excludeFields = ['Name', 'Employee', 'Email', 'ID', 'id', 'Max Hours', 'Team']
  
  Object.keys(row).forEach(key => {
    if (!excludeFields.includes(key)) {
      const value = row[key]
      if (value && value !== 'None' && value !== '') {
        // Try to parse as proficiency level
        if (['Beginner', 'Intermediate', 'Expert'].includes(value)) {
          skills[key] = value as ProficiencyLevel
        } else if (typeof value === 'number') {
          // Convert numeric values to proficiency levels
          if (value >= 3) skills[key] = 'Expert'
          else if (value >= 2) skills[key] = 'Intermediate'
          else if (value >= 1) skills[key] = 'Beginner'
        } else if (value) {
          // Default to Intermediate for any other non-empty value
          skills[key] = 'Intermediate'
        }
      }
    }
  })
  
  return skills
}