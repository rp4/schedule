import * as XLSX from 'xlsx'
import { ScheduleData } from '@/types/schedule'
import { formatDate } from '@/lib/utils'

export async function exportToExcel(data: ScheduleData): Promise<void> {
  const wb = XLSX.utils.book_new()

  // Employees sheet
  const employeesData = data.employees.map(emp => {
    const row: any = {
      ID: emp.id,
      Name: emp.name,
      Email: emp.email || '',
      'Max Hours': emp.maxHours,
      Team: emp.team || 'Default',
    }
    
    // Add skill columns
    Object.entries(emp.skills).forEach(([skill, level]) => {
      row[skill] = level
    })
    
    return row
  })
  
  if (employeesData.length > 0) {
    const ws1 = XLSX.utils.json_to_sheet(employeesData)
    XLSX.utils.book_append_sheet(wb, ws1, 'Employees')
  }

  // Projects sheet
  const projectsData = data.projects.map(proj => ({
    ID: proj.id,
    Name: proj.name,
    'Start Date': formatDate(proj.startDate),
    'End Date': formatDate(proj.endDate),
    'Required Skills': proj.requiredSkills?.join(', ') || '',
    Portfolio: proj.portfolio || '',
    Color: proj.color || '',
    'Budget Hours': proj.budgetHours || '',
  }))
  
  if (projectsData.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(projectsData)
    XLSX.utils.book_append_sheet(wb, ws2, 'Projects')
  }

  // Assignments sheet - convert to cross-tab format with weeks as columns
  // First, create a map to aggregate hours by employee-project-week
  const assignmentMap = new Map<string, Map<string, number>>()
  const weekSet = new Set<string>()
  
  // Build the employee-project to week-hours mapping
  data.assignments.forEach(assign => {
    // Check if this is a placeholder assignment
    const isPlaceholder = !assign.employeeId || (
      assign.employeeId === 'Placeholder' ||
      assign.employeeId.startsWith('Placeholder ')
    )

    let employeeName: string | undefined
    let projectName: string | undefined

    if (isPlaceholder) {
      // For placeholders, use the employeeId directly as the name (or 'Placeholder' if empty)
      employeeName = assign.employeeId || 'Placeholder'
      const project = data.projects.find(p => p.id === assign.projectId)
      projectName = project?.name
    } else {
      // For regular employees, find them in the employees list
      const employee = data.employees.find(e => e.id === assign.employeeId)
      const project = data.projects.find(p => p.id === assign.projectId)
      employeeName = employee?.name
      projectName = project?.name
    }

    if (employeeName && projectName) {
      const key = `${employeeName}|${projectName}`
      const weekKey = assign.date
      weekSet.add(weekKey)

      if (!assignmentMap.has(key)) {
        assignmentMap.set(key, new Map())
      }
      assignmentMap.get(key)!.set(weekKey, assign.hours)
    }
  })
  
  // Sort weeks chronologically
  const weeks = Array.from(weekSet).sort((a, b) => {
    const dateA = new Date(a)
    const dateB = new Date(b)
    return dateA.getTime() - dateB.getTime()
  })
  
  // Create the cross-tab data
  const assignmentsData: any[] = []
  assignmentMap.forEach((weekHours, empProjKey) => {
    const [employeeName, projectName] = empProjKey.split('|')
    const row: any = {
      Employee: employeeName,
      Project: projectName,
    }
    
    // Add hours for each week
    weeks.forEach(week => {
      row[week] = weekHours.get(week) || 0
    })
    
    assignmentsData.push(row)
  })
  
  if (assignmentsData.length > 0) {
    const ws3 = XLSX.utils.json_to_sheet(assignmentsData)
    XLSX.utils.book_append_sheet(wb, ws3, 'Assignments')
  }


  // Generate and download file
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `schedule_${new Date().toISOString().split('T')[0]}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}