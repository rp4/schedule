import { ScheduleData } from '@/types/schedule'
import { createExcelParserWorker } from './workerLoader'

// Function to parse Excel file using Web Worker
export async function parseExcelFileWithWorker(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ScheduleData> {
  console.log('parseExcelFileWithWorker started')
  
  return new Promise((resolve, reject) => {
    // Create a new worker
    const worker = createExcelParserWorker()
    
    if (!worker) {
      console.error('Worker creation returned null')
      reject(new Error('Failed to create Web Worker'))
      return
    }
    
    console.log('Worker created, setting up event listeners...')
    
    // Set up message handler
    worker.addEventListener('message', (event) => {
      console.log('Worker message received:', event.data.type)
      const { type } = event.data
      
      switch (type) {
        case 'progress':
          console.log('Progress update:', event.data.progress)
          if (onProgress) {
            onProgress(event.data.progress)
          }
          break
          
        case 'success':
          console.log('Parse success, data:', event.data.data)
          // Clean up worker
          worker.terminate()
          resolve(event.data.data)
          break
          
        case 'error':
          console.error('Parse error from worker:', event.data.error)
          // Clean up worker
          worker.terminate()
          reject(new Error(event.data.error))
          break
          
        default:
          console.warn('Unknown message type from worker:', type)
      }
    })
    
    // Handle worker errors
    worker.addEventListener('error', (error) => {
      worker.terminate()
      reject(new Error(`Worker error: ${error.message}`))
    })
    
    // Read file as array buffer
    const reader = new FileReader()
    
    console.log('Starting file reading...')
    
    reader.onload = (e) => {
      console.log('File read complete, size:', e.target?.result ? (e.target.result as ArrayBuffer).byteLength : 0)
      
      if (!e.target?.result) {
        console.error('No file content found')
        worker.terminate()
        reject(new Error('Failed to read file content'))
        return
      }
      
      // Send array buffer to worker
      const arrayBuffer = e.target.result as ArrayBuffer
      console.log('Sending arrayBuffer to worker, size:', arrayBuffer.byteLength)
      
      worker.postMessage({
        type: 'parse',
        data: { arrayBuffer }
      })
      
      console.log('Message posted to worker')
    }
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error)
      worker.terminate()
      reject(new Error('Failed to read file'))
    }
    
    console.log('Starting readAsArrayBuffer...')
    reader.readAsArrayBuffer(file)
  })
}

// Fallback to non-worker version if worker is not supported
export async function parseExcelFileFallback(file: File): Promise<ScheduleData> {
  // Import the original parser dynamically to avoid bundling it when not needed
  const { parseExcelFile } = await import('./parser')
  return parseExcelFile(file)
}

// Main export that checks for worker support
export async function parseExcelSafe(
  file: File,
  _onProgress?: (progress: number) => void
): Promise<ScheduleData> {
  console.log('parseExcelSafe called with file:', file.name)
  
  // For now, always use fallback due to Worker issues
  // TODO: Fix Worker implementation
  console.log('Using main thread parsing (Worker temporarily disabled)...')
  return parseExcelFileFallback(file)
  
  /*
  // Check if Web Workers are supported
  if (typeof Worker !== 'undefined') {
    console.log('Web Workers supported, attempting worker parsing...')
    try {
      const result = await parseExcelFileWithWorker(file, onProgress)
      console.log('Worker parsing successful')
      return result
    } catch (error) {
      console.error('Worker parsing failed:', error)
      console.log('Falling back to main thread parsing...')
      return parseExcelFileFallback(file)
    }
  } else {
    // No worker support, use fallback
    console.warn('Web Workers not supported, using main thread parsing')
    return parseExcelFileFallback(file)
  }
  */
}