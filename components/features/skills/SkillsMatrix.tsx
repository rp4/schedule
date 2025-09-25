'use client'

import { useScheduleStore } from '@/store/useScheduleStore'
import { useState, useMemo } from 'react'
import { Search, Award } from 'lucide-react'
import { ProficiencyLevel } from '@/types/schedule'

const proficiencyColors = {
  Expert: 'bg-green-100 text-green-800',
  Intermediate: 'bg-blue-100 text-blue-800',
  Beginner: 'bg-yellow-100 text-yellow-800',
  None: 'bg-gray-100 text-gray-400',
}

export function SkillsMatrix() {
  const employees = useScheduleStore((state) => state.employees)
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const skills = useScheduleStore((state) => state.skills)
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)
  const updateEmployee = useScheduleStore((state) => state.updateEmployee)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  // Filter employees by team, project, and search
  const filteredEmployees = useMemo(() => {
    let filtered = selectedTeam === 'All Teams' 
      ? employees 
      : employees.filter(e => e.team === selectedTeam)

    // Filter by project if selected
    if (selectedProject) {
      const project = projects.find(p => p.id === selectedProject)
      const employeeIdsInProject = new Set(
        assignments
          .filter(a => a.projectId === selectedProject || a.projectId === project?.name)
          .map(a => {
            // Handle both employee ID and name references
            const employee = employees.find(e => e.id === a.employeeId || e.name === a.employeeId)
            return employee?.id || a.employeeId
          })
      )
      filtered = filtered.filter(e => employeeIdsInProject.has(e.id))
    }

    if (searchTerm) {
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedSkill) {
      filtered = filtered.filter(e => e.skills[selectedSkill])
    }

    return filtered
  }, [employees, projects, assignments, selectedTeam, selectedProject, searchTerm, selectedSkill])

  const handleProficiencyChange = (
    employeeId: string,
    skill: string,
    level: ProficiencyLevel | 'None'
  ) => {
    const employee = employees.find(e => e.id === employeeId)
    if (!employee) return

    const newSkills = { ...employee.skills }
    if (level === 'None') {
      delete newSkills[skill]
    } else {
      newSkills[skill] = level
    }

    updateEmployee(employeeId, { skills: newSkills })
  }

  if (employees.length === 0 || skills.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full mb-4 shadow-inner">
          <Award className="w-8 h-8 text-purple-500" />
        </div>
        <h3 className="text-subheading mb-2">No Skills Data</h3>
        <p className="text-caption mb-6 max-w-md mx-auto">
          Upload an Excel file or load sample data to start tracking employee skills and competencies.
        </p>
        <button className="btn-primary">
          Get Started
        </button>
      </div>
    )
  }

  return (
    <div>
      <style jsx>{`
        .skills-table-container::-webkit-scrollbar {
          height: 8px;
        }
        .skills-table-container::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 4px;
        }
        .skills-table-container::-webkit-scrollbar-thumb {
          background: #9ca3af;
          border-radius: 4px;
        }
        .skills-table-container::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
      {/* Controls */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base pl-10"
          />
        </div>
        <select
          value={selectedProject || ''}
          onChange={(e) => setSelectedProject(e.target.value || null)}
          className="input-base"
        >
          <option value="">All Projects</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <select
          value={selectedSkill || ''}
          onChange={(e) => setSelectedSkill(e.target.value || null)}
          className="input-base"
        >
          <option value="">All Skills</option>
          {skills.map(skill => (
            <option key={skill} value={skill}>{skill}</option>
          ))}
        </select>
      </div>

      {/* Matrix */}
      <div 
        className="skills-table-container overflow-x-auto overflow-y-visible border rounded-lg shadow-sm"
        style={{ 
          maxWidth: '100%',
          scrollbarWidth: 'thin',
          scrollbarColor: '#9ca3af #f3f4f6'
        }}
      >
        <table className="border-collapse" style={{ minWidth: 'max-content' }}>
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border border-gray-200 font-semibold sticky left-0 bg-gray-50 z-10">
                Employee
              </th>
              <th className="text-left p-3 border border-gray-200 font-semibold">
                Team
              </th>
              <th className="text-left p-3 border border-gray-200 font-semibold">
                Max Hours
              </th>
              {skills.map(skill => (
                <th
                  key={skill}
                  className="text-center p-3 border border-gray-200 font-semibold min-w-[120px]"
                >
                  {skill}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(employee => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="p-3 border border-gray-200 font-medium sticky left-0 bg-white">
                  <div>
                    <div>{employee.name}</div>
                    {employee.email && (
                      <div className="text-xs text-gray-500">{employee.email}</div>
                    )}
                  </div>
                </td>
                <td className="p-3 border border-gray-200">
                  <input
                    type="text"
                    value={employee.team || ''}
                    onChange={(e) => updateEmployee(employee.id, { team: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="p-3 border border-gray-200">
                  <input
                    type="number"
                    value={employee.maxHours}
                    onChange={(e) => updateEmployee(employee.id, { maxHours: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="168"
                  />
                </td>
                {skills.map(skill => {
                  const level = employee.skills[skill] || 'None'
                  return (
                    <td key={skill} className="p-3 border border-gray-200 text-center">
                      <select
                        value={level}
                        onChange={(e) => 
                          handleProficiencyChange(
                            employee.id,
                            skill,
                            e.target.value as ProficiencyLevel | 'None'
                          )
                        }
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          proficiencyColors[level as keyof typeof proficiencyColors]
                        } cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      >
                        <option value="None">None</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="bg-gray-100 font-semibold">
              <td className="p-3 border border-gray-200 sticky left-0 bg-gray-100">
                Totals
              </td>
              <td className="p-3 border border-gray-200">
                {/* Empty cell for Team column */}
              </td>
              <td className="p-3 border border-gray-200 text-center">
                <div className="text-sm font-semibold">
                  {filteredEmployees.reduce((sum, e) => sum + e.maxHours, 0)}
                </div>
              </td>
              {skills.map(skill => {
                const experts = filteredEmployees.filter(e => e.skills[skill] === 'Expert').length
                const intermediate = filteredEmployees.filter(e => e.skills[skill] === 'Intermediate').length
                const beginners = filteredEmployees.filter(e => e.skills[skill] === 'Beginner').length
                const total = experts + intermediate + beginners
                
                return (
                  <td key={skill} className="p-3 border border-gray-200 text-center text-sm">
                    {total > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-600">
                          {experts > 0 && <span className="text-green-700">{experts}E</span>}
                          {experts > 0 && intermediate > 0 && <span className="text-gray-400"> / </span>}
                          {intermediate > 0 && <span className="text-blue-700">{intermediate}I</span>}
                          {(experts > 0 || intermediate > 0) && beginners > 0 && <span className="text-gray-400"> / </span>}
                          {beginners > 0 && <span className="text-yellow-700">{beginners}B</span>}
                        </div>
                        <div className="font-bold text-gray-900">{total}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}