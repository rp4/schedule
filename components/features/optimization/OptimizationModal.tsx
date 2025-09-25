'use client'

import React, { useState, useMemo } from 'react'
import { X, Brain, Settings, Play, Check, AlertCircle } from 'lucide-react'
import { useScheduleStore } from '@/store/useScheduleStore'
import { OptimizationResult } from '@/lib/optimization/optimizer'
import { optimizeScheduleSafe } from '@/lib/optimization/optimizerWithWorker'
import { ProgressBar } from '@/components/ui/ProgressBar'
import * as Slider from '@radix-ui/react-slider'

interface OptimizationModalProps {
  onClose: () => void
}

type Algorithm = 'genetic' | 'annealing' | 'constraint'

export function OptimizationModal({ onClose }: OptimizationModalProps) {
  const [algorithm, setAlgorithm] = useState<Algorithm>('genetic')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<OptimizationResult | null>(null)
  const [progress, setProgress] = useState(0)
  // Use raw values 0-10, will normalize when passing to optimizer
  const [rawWeights, setRawWeights] = useState({
    overtime: 10,
    utilization: 7,
    skills: 7,
  })

  // Get data from store with proper selectors
  const allEmployees = useScheduleStore((state) => state.employees)
  const allProjects = useScheduleStore((state) => state.projects)
  const allAssignments = useScheduleStore((state) => state.assignments)
  const skills = useScheduleStore((state) => state.skills)
  const teams = useScheduleStore((state) => state.teams)
  const dateRange = useScheduleStore((state) => state.dateRange)
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)

  // Filter data based on selected team
  const filteredData = useMemo(() => {
    let employees = allEmployees
    let projects = allProjects
    let assignments = allAssignments

    // Apply team filter if not "All Teams"
    if (selectedTeam !== 'All Teams') {
      // Filter employees by team
      employees = allEmployees.filter(e => e.team === selectedTeam)
      const teamEmployeeIds = new Set(employees.map(e => e.id))

      // Find projects that have assignments from team members
      const projectsWithTeamMembers = new Set<string>()
      allAssignments.forEach(a => {
        const employee = allEmployees.find(e => e.id === a.employeeId || e.name === a.employeeId)
        if (employee && teamEmployeeIds.has(employee.id)) {
          projectsWithTeamMembers.add(a.projectId)
          const project = allProjects.find(p => p.id === a.projectId || p.name === a.projectId)
          if (project) {
            projectsWithTeamMembers.add(project.id)
          }
        }
      })

      // Filter projects that team members work on
      projects = allProjects.filter(p =>
        projectsWithTeamMembers.has(p.id) || projectsWithTeamMembers.has(p.name)
      )

      // Filter assignments to only include those for filtered projects
      const filteredProjectIds = new Set(projects.map(p => p.id))
      assignments = allAssignments.filter(a => filteredProjectIds.has(a.projectId))
    }

    return { employees, projects, assignments }
  }, [allEmployees, allProjects, allAssignments, selectedTeam])

  // Memoize the schedule data object with filtered data
  const scheduleData = useMemo(() => ({
    employees: filteredData.employees,
    projects: filteredData.projects,
    assignments: filteredData.assignments,
    skills: skills || [],
    teams: teams || [],
  }), [filteredData, skills, teams])

  const handleOptimize = async () => {
    setIsOptimizing(true)
    setProgress(0)

    // Normalize weights to sum to 1
    const total = rawWeights.overtime + rawWeights.utilization + rawWeights.skills
    const normalizedWeights = {
      overtime: total > 0 ? rawWeights.overtime / total : 0.33,
      utilization: total > 0 ? rawWeights.utilization / total : 0.33,
      skills: total > 0 ? rawWeights.skills / total : 0.34,
    }

    try {
      // Run optimization
      const result = await optimizeScheduleSafe(
        scheduleData,
        algorithm,
        normalizedWeights,
        (prog) => setProgress(prog),
        dateRange
      )

      setProgress(100)
      setResults(result)
      
      // Show results after a brief delay
      setTimeout(() => {
        setIsOptimizing(false)
        setShowResults(true)
      }, 500)
    } catch {
      // Optimization error handled silently
      setIsOptimizing(false)
    }
  }
  
  const handleApply = () => {
    if (!results) return

    // Create a set of replaced placeholders for efficient lookup
    const replacedPlaceholders = new Set<string>()
    results.suggestions.forEach(suggestion => {
      // Create a unique key for each placeholder that was replaced
      replacedPlaceholders.add(`${suggestion.projectId}-${suggestion.week}`)
    })

    // Keep non-placeholder assignments and unreplaced placeholders from ALL assignments
    const filtered = allAssignments.filter(a => {
      const isPlaceholder = !a.employeeId || (
        a.employeeId === 'Placeholder' ||
        a.employeeId === 'placeholder' ||
        a.employeeId.startsWith('Placeholder ')
      )

      if (!isPlaceholder) {
        // Keep all non-placeholder assignments
        return true
      }

      // For placeholders, check if they were replaced
      const placeholderKey = `${a.projectId}-${a.week || a.date}`
      return !replacedPlaceholders.has(placeholderKey)
    })

    // Add suggested assignments
    results.suggestions.forEach(suggestion => {
      filtered.push({
        id: `${suggestion.suggestedEmployeeId}-${suggestion.projectId}-${suggestion.week}`,
        employeeId: suggestion.suggestedEmployeeId,
        projectId: suggestion.projectId,
        week: suggestion.week,
        date: suggestion.week, // Use week as date for now
        hours: suggestion.originalHours,
      })
    })

    // Update the store with ALL data (not just filtered)
    useScheduleStore.getState().loadData({
      employees: allEmployees,
      projects: allProjects,
      assignments: filtered,
      skills: useScheduleStore.getState().skills,
      teams: useScheduleStore.getState().teams,
    })

    onClose()
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Optimize Schedule</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {showResults && results ? (
            // Results View
            <div>
              <h3 className="font-semibold mb-4">Optimization Results</h3>
              
              {results.suggestions.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No placeholder assignments found to optimize.</p>
                </div>
              ) : (
                <>
                  {/* Summary Metrics */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Overtime Hours</div>
                        <div className="font-semibold">
                          {results.metrics.currentOvertimeHours.toFixed(0)} → {results.metrics.predictedOvertimeHours.toFixed(0)}
                          <span className={`ml-2 text-xs ${results.metrics.predictedOvertimeHours < results.metrics.currentOvertimeHours ? 'text-green-600' : 'text-orange-600'}`}>
                            ({results.metrics.predictedOvertimeHours - results.metrics.currentOvertimeHours > 0 ? '+' : ''}{(results.metrics.predictedOvertimeHours - results.metrics.currentOvertimeHours).toFixed(0)})
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Utilization</div>
                        <div className="font-semibold">
                          {results.metrics.currentUtilization.toFixed(1)}% → {results.metrics.predictedUtilization.toFixed(1)}%
                          <span className={`ml-2 text-xs ${results.metrics.predictedUtilization > results.metrics.currentUtilization ? 'text-green-600' : 'text-orange-600'}`}>
                            ({results.metrics.predictedUtilization > results.metrics.currentUtilization ? '+' : ''}{(results.metrics.predictedUtilization - results.metrics.currentUtilization).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Skills Match</div>
                        <div className="font-semibold">
                          {results.metrics.currentSkillsMatch.toFixed(0)} → {results.metrics.predictedSkillsMatch.toFixed(0)}
                          <span className={`ml-2 text-xs ${results.metrics.predictedSkillsMatch > results.metrics.currentSkillsMatch ? 'text-green-600' : 'text-orange-600'}`}>
                            ({results.metrics.predictedSkillsMatch > results.metrics.currentSkillsMatch ? '+' : ''}{(results.metrics.predictedSkillsMatch - results.metrics.currentSkillsMatch).toFixed(0)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Suggested Assignments */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Suggested Assignments</h4>
                    <div className="space-y-3">
                      {(() => {
                        // Group suggestions by project
                        const groupedByProject = results.suggestions.reduce((acc, suggestion) => {
                          if (!acc[suggestion.projectId]) {
                            acc[suggestion.projectId] = {
                              projectName: suggestion.projectName,
                              employees: new Map()
                            }
                          }
                          if (!acc[suggestion.projectId].employees.has(suggestion.suggestedEmployeeId)) {
                            acc[suggestion.projectId].employees.set(suggestion.suggestedEmployeeId, {
                              name: suggestion.suggestedEmployeeName,
                              totalHours: 0,
                              weeks: []
                            })
                          }
                          const emp = acc[suggestion.projectId].employees.get(suggestion.suggestedEmployeeId)!
                          emp.totalHours += suggestion.originalHours
                          emp.weeks.push(suggestion.week)
                          return acc
                        }, {} as Record<string, { projectName: string, employees: Map<string, { name: string, totalHours: number, weeks: string[] }> }>)
                        
                        return Object.entries(groupedByProject).map(([projectId, project]) => (
                          <div key={projectId} className="bg-gray-50 rounded-lg p-4">
                            <h5 className="font-medium text-gray-900 mb-2">{project.projectName}</h5>
                            <div className="flex flex-wrap gap-2">
                              {Array.from(project.employees.entries()).map(([empId, emp]) => (
                                <div key={empId} className="bg-white px-3 py-2 rounded-md border border-gray-200 flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700">{emp.name}</span>
                                  <span className="text-xs text-gray-500">({emp.totalHours}h)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleApply}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Apply Changes
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : !isOptimizing ? (
            <>
              {/* Optimization Weights */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Optimization Weights</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Minimize Overtime</span>
                      <span className="text-sm text-gray-600">
                        {rawWeights.overtime}/10
                      </span>
                    </div>
                    <Slider.Root
                      value={[rawWeights.overtime]}
                      onValueChange={([value]) => 
                        setRawWeights({ ...rawWeights, overtime: value })
                      }
                      max={10}
                      step={1}
                      className="relative flex items-center select-none touch-none w-full h-5"
                    >
                      <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
                        <Slider.Range className="absolute bg-orange-500 rounded-full h-full" />
                      </Slider.Track>
                      <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-orange-500 rounded-full hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </Slider.Root>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Maximize Utilization</span>
                      <span className="text-sm text-gray-600">
                        {rawWeights.utilization}/10
                      </span>
                    </div>
                    <Slider.Root
                      value={[rawWeights.utilization]}
                      onValueChange={([value]) => 
                        setRawWeights({ ...rawWeights, utilization: value })
                      }
                      max={10}
                      step={1}
                      className="relative flex items-center select-none touch-none w-full h-5"
                    >
                      <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
                        <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                      </Slider.Track>
                      <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </Slider.Root>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Optimize Skills Matching</span>
                      <span className="text-sm text-gray-600">
                        {rawWeights.skills}/10
                      </span>
                    </div>
                    <Slider.Root
                      value={[rawWeights.skills]}
                      onValueChange={([value]) => 
                        setRawWeights({ ...rawWeights, skills: value })
                      }
                      max={10}
                      step={1}
                      className="relative flex items-center select-none touch-none w-full h-5"
                    >
                      <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
                        <Slider.Range className="absolute bg-green-500 rounded-full h-full" />
                      </Slider.Track>
                      <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-green-500 rounded-full hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </Slider.Root>
                  </div>
                </div>
              </div>

              {/* Algorithm Selection */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Optimization Algorithm
                </h3>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="genetic">Genetic Algorithm - Best for complex multi-objective optimization</option>
                  <option value="annealing">Simulated Annealing - Good for local optimization and fine-tuning</option>
                  <option value="constraint">Constraint Satisfaction - Fast, rule-based assignment</option>
                </select>
                <p className="mt-2 text-xs text-gray-600">
                  {algorithm === 'genetic' && 'Uses evolutionary computation to explore a wide solution space and find globally optimal assignments.'}
                  {algorithm === 'annealing' && 'Gradually improves assignments by making small changes, good for refining existing schedules.'}
                  {algorithm === 'constraint' && 'Quickly finds valid assignments using hard rules, prioritizing constraint satisfaction over optimization.'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleOptimize}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Run Optimization
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="py-8">
              <h3 className="text-center font-semibold mb-6">Optimizing Schedule...</h3>
              <ProgressBar 
                progress={progress}
                label={
                  progress < 30 ? 'Analyzing current schedule...' :
                  progress < 60 ? 'Generating optimization candidates...' :
                  progress < 90 ? 'Evaluating solutions...' :
                  'Finalizing optimal schedule...'
                }
                className="mb-4"
              />
              <p className="text-center text-sm text-gray-500">
                This may take a few moments for large datasets
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}