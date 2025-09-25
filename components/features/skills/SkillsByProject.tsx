'use client'

import { useMemo } from 'react'
import { useScheduleStore } from '@/store/useScheduleStore'

export function SkillsByProject() {
  const { employees, projects, assignments } = useScheduleStore()

  const { projectSkillMatrix, allSkills, maxValue } = useMemo(() => {
    // Create employee maps for fast lookup (both by ID and by name)
    const employeeMap = new Map<string, typeof employees[0]>()
    employees.forEach(emp => {
      employeeMap.set(emp.id, emp)
      employeeMap.set(emp.name, emp)  // Also map by name for fallback
    })

    // Collect all unique skills from all employees
    const skillsSet = new Set<string>()
    employees.forEach(employee => {
      Object.keys(employee.skills || {}).forEach(skill => {
        skillsSet.add(skill)
      })
    })
    const sortedSkills = Array.from(skillsSet).sort()

    // Create matrix: project -> skill -> total points
    const matrix = new Map<string, Map<string, number>>()
    
    // Track processed employee-project pairs to avoid duplicates
    const processedPairs = new Set<string>()

    assignments.forEach(assignment => {
      // Get employee from map (try ID first, then name)
      const employee = employeeMap.get(assignment.employeeId) || 
                      employeeMap.get(assignment.employeeId) // fallback to same for consistency
      
      const project = projects.find(p => p.id === assignment.projectId)
      
      if (!employee || !project) return

      // Create unique key using actual resolved IDs
      const pairKey = `${employee.id}-${project.id}`
      
      // Skip if we've already processed this pair
      if (processedPairs.has(pairKey)) return
      
      processedPairs.add(pairKey)

      // Initialize project row if needed
      if (!matrix.has(project.id)) {
        matrix.set(project.id, new Map())
      }
      
      const projectRow = matrix.get(project.id)!
      
      // Only add points for skills that are required by the project
      if (project.requiredSkills && project.requiredSkills.length > 0) {
        project.requiredSkills.forEach(skill => {
          const proficiency = employee.skills?.[skill]
          if (proficiency) {
            const points = proficiency === 'Expert' ? 3 : 
                          proficiency === 'Intermediate' ? 2 : 
                          proficiency === 'Beginner' ? 1 : 0
            
            const currentPoints = projectRow.get(skill) || 0
            projectRow.set(skill, currentPoints + points)
          } else {
            // Required skill with no coverage - mark as 0
            if (!projectRow.has(skill)) {
              projectRow.set(skill, 0)
            }
          }
        })
      }
    })

    // Find the maximum value across all cells for color scaling
    let max = 0
    matrix.forEach(projectRow => {
      projectRow.forEach(value => {
        if (value > max) max = value
      })
    })

    return { projectSkillMatrix: matrix, allSkills: sortedSkills, maxValue: max }
  }, [employees, projects, assignments])

  // Helper function to calculate heatmap color
  const getHeatmapColor = (value: number | undefined, isRequired: boolean): string => {
    if (!isRequired || value === undefined) return ''

    // For 0 values, return red
    if (value === 0) return 'rgba(239, 68, 68, 0.2)' // red-500 with opacity

    // For values between 0 and max, interpolate between red and green
    if (maxValue === 0) return ''

    const ratio = value / maxValue
    // Interpolate between red and green
    const red = Math.round(255 * (1 - ratio))
    const green = Math.round(255 * ratio)
    return `rgba(${red}, ${green}, 0, 0.2)`
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">No Projects Yet</p>
          <p className="text-sm text-gray-400 mt-2">Import an Excel file to see project skill requirements</p>
        </div>
      </div>
    )
  }

  if (allSkills.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">No Skills Data Available</p>
          <p className="text-sm text-gray-400 mt-2">Import employee skills data to see the matrix</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project
            </th>
            {allSkills.map(skill => (
              <th key={skill} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {skill}
              </th>
            ))}
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {projects.map(project => {
            const projectSkills = projectSkillMatrix.get(project.id)
            const requiredSkills = new Set(project.requiredSkills || [])
            
            // Calculate total for required skills only
            const total = projectSkills 
              ? Array.from(projectSkills.entries())
                  .filter(([skill]) => requiredSkills.has(skill))
                  .reduce((sum, [, points]) => sum + points, 0)
              : 0

            return (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {project.name}
                </td>
                {allSkills.map(skill => {
                  const points = projectSkills?.get(skill)
                  const isRequired = requiredSkills.has(skill)
                  
                  // Only show value if it's a required skill
                  const displayValue = isRequired 
                    ? (points === 0 ? '0 ⚠' : points?.toString() || '0 ⚠')
                    : '-'

                  return (
                    <td
                      key={skill}
                      className={`px-4 py-2 text-center text-sm ${
                        isRequired
                          ? points === 0
                            ? 'text-red-600 font-medium'
                            : 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                      style={{
                        backgroundColor: getHeatmapColor(points, isRequired)
                      }}
                    >
                      {displayValue}
                    </td>
                  )
                })}
                <td className="px-4 py-2 text-center text-sm font-medium text-gray-900">
                  {total}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}