import { describe, it, expect } from 'vitest'
import {
  calculateSkillsMatch,
  getEmployeeProjectSkillScore,
  createSkillScoreMatrix,
  calculateResourceUtilization
} from './metrics'
import { Employee, Project, Assignment } from '@/types/schedule'

describe('Skills Matching Optimization', () => {
  const mockEmployees: Employee[] = [
    {
      id: 'emp1',
      name: 'John',
      maxHours: 40,
      skills: {
        'Data': 'Expert',
        'Finance': 'Expert',
        'Analytics': 'Intermediate'
      }
    },
    {
      id: 'emp2',
      name: 'Jane',
      maxHours: 40,
      skills: {
        'Data': 'Beginner',
        'Marketing': 'Expert'
      }
    }
  ]

  const mockProjects: Project[] = [
    {
      id: 'proj1',
      name: 'Project A',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      requiredSkills: ['Data', 'Finance']
    },
    {
      id: 'proj2',
      name: 'Project B',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      requiredSkills: ['Marketing', 'Analytics']
    }
  ]

  const mockAssignments: Assignment[] = [
    {
      id: 'assign1',
      employeeId: 'emp1',
      projectId: 'proj1',
      hours: 20,
      week: '2024-W01',
      date: '2024-01-01'
    },
    {
      id: 'assign2',
      employeeId: 'emp2',
      projectId: 'proj2',
      hours: 15,
      week: '2024-W01',
      date: '2024-01-01'
    }
  ]

  describe('calculateSkillsMatch', () => {
    it('should calculate correct total skill points', () => {
      const employeeMap = new Map(mockEmployees.map(e => [e.id, e]))
      const projectMap = new Map(mockProjects.map(p => [p.id, p]))
      
      const score = calculateSkillsMatch(mockAssignments, employeeMap, projectMap)
      
      // emp1 on proj1: Expert in Data (3) + Expert in Finance (3) = 6
      // emp2 on proj2: Expert in Marketing (3) + no Analytics (0) = 3
      // Total = 9
      expect(score).toBe(9)
    })

    it('should handle empty assignments', () => {
      const employeeMap = new Map(mockEmployees.map(e => [e.id, e]))
      const projectMap = new Map(mockProjects.map(p => [p.id, p]))
      
      const score = calculateSkillsMatch([], employeeMap, projectMap)
      expect(score).toBe(0)
    })

    it('should handle missing employees or projects', () => {
      const invalidAssignments: Assignment[] = [
        {
          id: 'invalid1',
          employeeId: 'nonexistent',
          projectId: 'proj1',
          hours: 10,
          week: '2024-W01', date: '2024-01-01'
        }
      ]
      
      const employeeMap = new Map(mockEmployees.map(e => [e.id, e]))
      const projectMap = new Map(mockProjects.map(p => [p.id, p]))
      
      const score = calculateSkillsMatch(invalidAssignments, employeeMap, projectMap)
      expect(score).toBe(0)
    })
  })

  describe('getEmployeeProjectSkillScore', () => {
    it('should calculate correct score for employee-project pair', () => {
      const score = getEmployeeProjectSkillScore(mockEmployees[0], mockProjects[0])
      // Expert in Data (3) + Expert in Finance (3) = 6
      expect(score).toBe(6)
    })

    it('should return 0 for project with no required skills', () => {
      const projectNoSkills: Project = {
        id: 'proj3',
        name: 'Project C',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      }
      
      const score = getEmployeeProjectSkillScore(mockEmployees[0], projectNoSkills)
      expect(score).toBe(0)
    })

    it('should handle partial skill matches', () => {
      const score = getEmployeeProjectSkillScore(mockEmployees[1], mockProjects[0])
      // Beginner in Data (1) + no Finance (0) = 1
      expect(score).toBe(1)
    })
  })

  describe('createSkillScoreMatrix', () => {
    it('should create correct skill score matrix', () => {
      const matrix = createSkillScoreMatrix(mockEmployees, mockProjects)
      
      // Check emp1 scores
      expect(matrix.get('emp1')?.get('proj1')).toBe(6) // Data(3) + Finance(3)
      expect(matrix.get('emp1')?.get('proj2')).toBe(2) // Analytics(2)
      
      // Check emp2 scores
      expect(matrix.get('emp2')?.get('proj1')).toBe(1) // Data(1)
      expect(matrix.get('emp2')?.get('proj2')).toBe(3) // Marketing(3)
    })

    it('should only include non-zero scores', () => {
      const employeesNoSkills: Employee[] = [
        {
          id: 'emp3',
          name: 'Bob',
          maxHours: 40,
          skills: {}
        }
      ]
      
      const matrix = createSkillScoreMatrix(employeesNoSkills, mockProjects)
      expect(matrix.has('emp3')).toBe(false)
    })
  })

  describe('Performance test', () => {
    it('should handle large datasets efficiently', () => {
      // Create large dataset
      const largeEmployees: Employee[] = []
      const largeProjects: Project[] = []
      const largeAssignments: Assignment[] = []
      
      // Create 100 employees with various skills
      for (let i = 0; i < 100; i++) {
        largeEmployees.push({
          id: `emp${i}`,
          name: `Employee ${i}`,
          maxHours: 40,
          skills: {
            'Skill1': i % 3 === 0 ? 'Expert' : i % 3 === 1 ? 'Intermediate' : 'Beginner',
            'Skill2': i % 2 === 0 ? 'Expert' : 'Beginner',
            'Skill3': i % 5 === 0 ? 'Intermediate' : undefined
          } as any
        })
      }
      
      // Create 50 projects
      for (let i = 0; i < 50; i++) {
        largeProjects.push({
          id: `proj${i}`,
          name: `Project ${i}`,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          requiredSkills: ['Skill1', 'Skill2', 'Skill3']
        })
      }
      
      // Create 500 assignments
      for (let i = 0; i < 500; i++) {
        largeAssignments.push({
          id: `assign${i}`,
          employeeId: `emp${i % 100}`,
          projectId: `proj${i % 50}`,
          hours: 10,
          week: '2024-W01',
          date: '2024-01-01'
        })
      }
      
      // Test performance
      const startTime = performance.now()
      
      // Pre-compute maps
      const employeeMap = new Map(largeEmployees.map(e => [e.id, e]))
      const projectMap = new Map(largeProjects.map(p => [p.id, p]))
      
      // Calculate skills match
      const score = calculateSkillsMatch(largeAssignments, employeeMap, projectMap)
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      console.log(`Execution time for 500 assignments: ${executionTime.toFixed(2)}ms`)
      
      // Should complete in under 10ms for this size
      expect(executionTime).toBeLessThan(10)
      expect(score).toBeGreaterThan(0)
    })

    it('should efficiently create skill matrix for large datasets', () => {
      const largeEmployees: Employee[] = []
      const largeProjects: Project[] = []
      
      // Create 200 employees
      for (let i = 0; i < 200; i++) {
        const skills: Record<string, any> = {}
        for (let j = 0; j < 10; j++) {
          if (Math.random() > 0.3) {
            skills[`Skill${j}`] = 
              Math.random() > 0.66 ? 'Expert' : 
              Math.random() > 0.33 ? 'Intermediate' : 'Beginner'
          }
        }
        
        largeEmployees.push({
          id: `emp${i}`,
          name: `Employee ${i}`,
          maxHours: 40,
          skills
        })
      }
      
      // Create 100 projects
      for (let i = 0; i < 100; i++) {
        const requiredSkills = []
        for (let j = 0; j < 5; j++) {
          requiredSkills.push(`Skill${Math.floor(Math.random() * 10)}`)
        }
        
        largeProjects.push({
          id: `proj${i}`,
          name: `Project ${i}`,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          requiredSkills
        })
      }
      
      const startTime = performance.now()
      const matrix = createSkillScoreMatrix(largeEmployees, largeProjects)
      const endTime = performance.now()
      
      const executionTime = endTime - startTime
      console.log(`Matrix creation time for 200 employees x 100 projects: ${executionTime.toFixed(2)}ms`)
      
      // Should complete in under 50ms
      expect(executionTime).toBeLessThan(50)
      expect(matrix.size).toBeGreaterThan(0)
    })
  })
})

describe('Resource Utilization Calculation', () => {
  it('calculates correct utilization for single employee over multiple weeks', () => {
    // Test case from requirements:
    // John with maxHours=40, assigned 10hrs week1 + 50hrs week2
    // Expected: (60 / 80) * 100 = 75%
    
    const employees: Employee[] = [
      { id: 'john', name: 'John', maxHours: 40, skills: {} }
    ]
    
    const assignments: Assignment[] = [
      { id: '1', employeeId: 'john', projectId: 'p1', hours: 10, week: 'week1', date: '2024-01-01' },
      { id: '2', employeeId: 'john', projectId: 'p1', hours: 50, week: 'week2', date: '2024-01-08' }
    ]
    
    const utilization = calculateResourceUtilization(employees, assignments)
    expect(utilization).toBe(75)
  })
  
  it('calculates correct utilization for multiple employees', () => {
    const employees: Employee[] = [
      { id: 'john', name: 'John', maxHours: 40, skills: {} },
      { id: 'jane', name: 'Jane', maxHours: 30, skills: {} }
    ]
    
    const assignments: Assignment[] = [
      { id: '1', employeeId: 'john', projectId: 'p1', hours: 20, week: 'week1', date: '2024-01-01' },
      { id: '2', employeeId: 'john', projectId: 'p1', hours: 20, week: 'week2', date: '2024-01-08' },
      { id: '3', employeeId: 'jane', projectId: 'p1', hours: 15, week: 'week1', date: '2024-01-01' },
      { id: '4', employeeId: 'jane', projectId: 'p1', hours: 15, week: 'week2', date: '2024-01-08' }
    ]
    
    // Total assigned: 20 + 20 + 15 + 15 = 70
    // Total capacity: (40 + 30) * 2 weeks = 140
    // Expected: (70 / 140) * 100 = 50%
    
    const utilization = calculateResourceUtilization(employees, assignments)
    expect(utilization).toBe(50)
  })
  
  it('returns 0 for empty employees', () => {
    const employees: Employee[] = []
    const assignments: Assignment[] = []
    
    const utilization = calculateResourceUtilization(employees, assignments)
    expect(utilization).toBe(0)
  })
  
  it('handles single time period correctly', () => {
    const employees: Employee[] = [
      { id: 'john', name: 'John', maxHours: 40, skills: {} }
    ]
    
    const assignments: Assignment[] = [
      { id: '1', employeeId: 'john', projectId: 'p1', hours: 30, week: 'week1', date: '2024-01-01' }
    ]
    
    // Total assigned: 30
    // Total capacity: 40 * 1 week = 40
    // Expected: (30 / 40) * 100 = 75%
    
    const utilization = calculateResourceUtilization(employees, assignments)
    expect(utilization).toBe(75)
  })
  
  it('handles date-based assignments correctly', () => {
    const employees: Employee[] = [
      { id: 'john', name: 'John', maxHours: 40, skills: {} }
    ]
    
    const assignments: Assignment[] = [
      { id: '1', employeeId: 'john', projectId: 'p1', hours: 8, week: 'JAN 1', date: '2024-01-01' },
      { id: '2', employeeId: 'john', projectId: 'p1', hours: 8, week: 'JAN 2', date: '2024-01-02' },
      { id: '3', employeeId: 'john', projectId: 'p1', hours: 8, week: 'JAN 3', date: '2024-01-03' }
    ]
    
    // Total assigned: 24
    // Total capacity: 40 * 3 days = 120
    // Expected: (24 / 120) * 100 = 20%
    
    const utilization = calculateResourceUtilization(employees, assignments)
    expect(utilization).toBe(20)
  })
  
  it('handles no assignments correctly', () => {
    const employees: Employee[] = [
      { id: 'john', name: 'John', maxHours: 40, skills: {} },
      { id: 'jane', name: 'Jane', maxHours: 30, skills: {} }
    ]
    
    const assignments: Assignment[] = []
    
    // With no assignments, default to 1 period
    // Total assigned: 0
    // Total capacity: (40 + 30) * 1 = 70
    // Expected: 0%
    
    const utilization = calculateResourceUtilization(employees, assignments)
    expect(utilization).toBe(0)
  })
  
  it('performs efficiently with large datasets', () => {
    const largeEmployees: Employee[] = []
    const largeAssignments: Assignment[] = []
    
    // Create 1000 employees
    for (let i = 0; i < 1000; i++) {
      largeEmployees.push({
        id: `emp${i}`,
        name: `Employee ${i}`,
        maxHours: 40,
        skills: {}
      })
    }
    
    // Create 10000 assignments across 52 weeks
    for (let i = 0; i < 10000; i++) {
      largeAssignments.push({
        id: `assign${i}`,
        employeeId: `emp${i % 1000}`,
        projectId: `proj${i % 100}`,
        hours: Math.floor(Math.random() * 40),
        week: `week${(i % 52) + 1}`,
        date: `2024-01-${String((i % 52) + 1).padStart(2, '0')}`
      })
    }
    
    const startTime = performance.now()
    const utilization = calculateResourceUtilization(largeEmployees, largeAssignments)
    const endTime = performance.now()
    
    const executionTime = endTime - startTime
    console.log(`Resource utilization calculation for 1000 employees, 10000 assignments: ${executionTime.toFixed(2)}ms`)
    
    // Should complete very quickly (under 15ms)
    expect(executionTime).toBeLessThan(15)
    expect(utilization).toBeGreaterThan(0)
    expect(utilization).toBeLessThanOrEqual(100)
  })
})