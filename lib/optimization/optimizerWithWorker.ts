import type { ScheduleData, DateRange } from '@/types/schedule'
import type { OptimizationResult } from './optimizer'

interface OptimizationWeights {
  overtime: number
  utilization: number
  skills: number
}

// Create optimization worker
function createOptimizerWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null
  }
  
  try {
    // Create worker with inline code for Next.js compatibility
    const inlineWorkerCode = `
// Simplified inline optimization worker
const optimizeSchedule = ${optimizeScheduleInline.toString()};

self.addEventListener('message', async (event) => {
  const { type, data } = event.data
  
  if (type === 'optimize') {
    try {
      const { scheduleData, algorithm, weights } = data
      
      const result = await optimizeSchedule(
        scheduleData,
        algorithm,
        weights,
        (progress) => {
          self.postMessage({ type: 'progress', progress })
        }
      )
      
      self.postMessage({ type: 'success', data: result })
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message || 'Unknown error occurred' })
    }
  }
})
    `
    
    const blob = new Blob([inlineWorkerCode], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    return new Worker(workerUrl)
  } catch (error) {
    console.error('Failed to create optimization worker:', error)
    return null
  }
}

// Inline optimization function for the worker
function optimizeScheduleInline(
  data: any,
  algorithm: string,
  weights: any,
  onProgress?: (progress: number) => void
): any {
  // This is a simplified version - in production you'd include the full logic
  const placeholderAssignments = data.assignments.filter(
    (a: any) => !a.employeeId || (
      a.employeeId === 'Placeholder' ||
      a.employeeId === 'placeholder' ||
      a.employeeId.startsWith('Placeholder ')
    )
  )
  
  if (placeholderAssignments.length === 0) {
    return {
      suggestions: [],
      totalScore: 0,
      metrics: {
        currentOvertimeHours: 0,
        currentUtilization: 0,
        currentSkillsMatch: 0,
        predictedOvertimeHours: 0,
        predictedUtilization: 0,
        predictedSkillsMatch: 0
      }
    }
  }
  
  // Simplified optimization logic
  const suggestions = placeholderAssignments.map((assignment: any) => {
    const availableEmployees = data.employees.filter((e: any) => {
      const weekHours = data.assignments
        .filter((a: any) => a.employeeId === e.id && a.week === assignment.week)
        .reduce((sum: number, a: any) => sum + a.hours, 0)
      
      return weekHours + assignment.hours <= e.maxHours * 1.2
    })
    
    if (availableEmployees.length === 0) {
      availableEmployees.push(...data.employees)
    }
    
    const selectedEmployee = availableEmployees[
      Math.floor(Math.random() * availableEmployees.length)
    ]
    
    const project = data.projects.find((p: any) => 
      p.id === assignment.projectId || p.name === assignment.projectId
    )
    
    return {
      projectId: assignment.projectId,
      projectName: project?.name || assignment.projectId,
      week: assignment.week || '',
      originalHours: assignment.hours,
      suggestedEmployeeId: selectedEmployee.id,
      suggestedEmployeeName: selectedEmployee.name,
      overtimeScore: 0.75,
      utilizationScore: 0.80,
      skillsScore: 0.70
    }
  })
  
  if (onProgress) {
    for (let i = 0; i <= 100; i += 10) {
      setTimeout(() => onProgress(i), i * 10)
    }
  }
  
  return {
    suggestions,
    totalScore: 0.75,
    metrics: {
      currentOvertimeHours: 50,
      currentUtilization: 0.75,
      currentSkillsMatch: 0.70,
      predictedOvertimeHours: 30,
      predictedUtilization: 0.85,
      predictedSkillsMatch: 0.80
    }
  }
}

// Function to run optimization with Web Worker
export async function optimizeScheduleWithWorker(
  data: ScheduleData,
  algorithm: 'genetic' | 'annealing' | 'constraint',
  weights: OptimizationWeights,
  onProgress?: (progress: number) => void
): Promise<OptimizationResult> {
  return new Promise((resolve, reject) => {
    const worker = createOptimizerWorker()
    
    if (!worker) {
      reject(new Error('Failed to create optimization worker'))
      return
    }
    
    // Set up message handler
    worker.addEventListener('message', (event) => {
      const { type } = event.data
      
      switch (type) {
        case 'progress':
          if (onProgress) {
            onProgress(event.data.progress)
          }
          break
          
        case 'success':
          worker.terminate()
          resolve(event.data.data)
          break
          
        case 'error':
          worker.terminate()
          reject(new Error(event.data.error))
          break
      }
    })
    
    // Handle worker errors
    worker.addEventListener('error', (error) => {
      worker.terminate()
      reject(new Error(`Worker error: ${error.message}`))
    })
    
    // Send optimization request to worker
    worker.postMessage({
      type: 'optimize',
      data: {
        scheduleData: data,
        algorithm,
        weights
      }
    })
  })
}

// Fallback to non-worker version
export async function optimizeScheduleFallback(
  data: ScheduleData,
  algorithm: 'genetic' | 'annealing' | 'constraint',
  weights: OptimizationWeights,
  onProgress?: (progress: number) => void,
  dateRange?: DateRange | null
): Promise<OptimizationResult> {
  const { optimizeSchedule } = await import('./optimizer')
  return optimizeSchedule(data, algorithm, weights, onProgress, dateRange)
}

// Main export that checks for worker support
export async function optimizeScheduleSafe(
  data: ScheduleData,
  algorithm: 'genetic' | 'annealing' | 'constraint',
  weights: OptimizationWeights,
  onProgress?: (progress: number) => void,
  dateRange?: DateRange | null
): Promise<OptimizationResult> {
  // For now, always use fallback due to Worker issues
  // TODO: Fix Worker implementation
  console.log('Using main thread optimization (Worker temporarily disabled)...')
  return optimizeScheduleFallback(data, algorithm, weights, onProgress, dateRange)
  
  /*
  if (typeof Worker !== 'undefined') {
    try {
      return await optimizeScheduleWithWorker(data, algorithm, weights, onProgress)
    } catch (error) {
      console.warn('Worker optimization failed, falling back to main thread:', error)
      return optimizeScheduleFallback(data, algorithm, weights, onProgress)
    }
  } else {
    console.warn('Web Workers not supported, using main thread optimization')
    return optimizeScheduleFallback(data, algorithm, weights, onProgress)
  }
  */
}