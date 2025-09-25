'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// Removed unused imports
import { useScheduleStore } from '@/store/useScheduleStore'
import { parseExcelSafe } from '@/lib/excel/parserWithWorker'
import { showToast } from '@/components/ui/Toast'
import { ProgressBar } from '@/components/ui/ProgressBar'
// Removed unused import
import { SchedulerLandingPage } from '@/components/SchedulerLandingPage'

export function LandingPageClient() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [fileToProcess, setFileToProcess] = useState<File | null>(null)
  const [parseProgress, setParseProgress] = useState(0)
  const [isParsingFile, setIsParsingFile] = useState(false)
  const loadData = useScheduleStore((state) => state.loadData)

  // Debug logging
  console.log('[LandingPageClient] Render - isLoading:', isLoading, 'fileToProcess:', fileToProcess?.name)

  // Process file in useEffect to ensure proper state updates
  useEffect(() => {
    console.log('useEffect triggered, fileToProcess:', fileToProcess)
    if (!fileToProcess) {
      console.log('No file to process, returning')
      return
    }

    const processFile = async () => {
      try {
        console.log('Starting to parse file:', fileToProcess.name)
        setIsParsingFile(true)
        setParseProgress(0)
        
        const data = await parseExcelSafe(fileToProcess, (progress) => {
          console.log('Progress callback:', progress)
          setParseProgress(progress)
        })
        console.log('Parsed data:', data)
        
        // Validate data has content
        if (!data.employees?.length && !data.projects?.length && !data.assignments?.length) {
          throw new Error('No data found in the Excel file. Please check the sheet names and format.')
        }
        
        loadData(data)
        console.log('Data loaded to store, navigating...')
        
        // Add small delay to ensure state is saved
        setTimeout(() => {
          router.push('/schedule')
        }, 100)
        // Don't reset loading state here since we're navigating away
      } catch (error) {
        console.error('Error processing file:', error)
        const errorMessage = error instanceof Error ? error.message : 'Please check the file format and try again.'
        showToast('error', 'Failed to parse Excel file', errorMessage)
        setIsLoading(false) // Only reset on error
        setIsParsingFile(false)
        setParseProgress(0)
        setFileToProcess(null)
      }
    }

    processFile()
  }, [fileToProcess, loadData, router])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0]
      console.log('[handleFileUpload] File selected:', file)
      if (!file) {
        console.log('[handleFileUpload] No file selected')
        return
      }
      
      console.log('[handleFileUpload] File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      })

      // Validate file type
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        console.log('[handleFileUpload] Invalid file type')
        showToast('error', 'Invalid file type', 'Please select an Excel file (.xlsx or .xls)')
        event.target.value = '' // Reset input
        return
      }
      
      // Validate file size (max 10MB)
      const maxSizeInBytes = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSizeInBytes) {
        console.log('[handleFileUpload] File too large')
        showToast('error', 'File too large', `Please select a file smaller than 10MB (current: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`)
        event.target.value = '' // Reset input
        return
      }
      
      console.log('[handleFileUpload] Setting loading state and file to process')
      setIsLoading(true)
      setFileToProcess(file)
      
      // Reset the input value so the same file can be selected again if needed
      event.target.value = ''
    } catch (error) {
      console.error('[handleFileUpload] Error:', error)
      showToast('error', 'Upload failed', 'An error occurred while processing the file')
      setIsLoading(false)
      event.target.value = ''
    }
  }

  const handleLoadSampleData = async () => {
    setIsLoading(true)
    try {
      // Fetch the sample Excel file from public directory
      const response = await fetch('/ScheduleSample.xlsx')
      if (!response.ok) {
        throw new Error('Failed to load sample data')
      }
      
      // Convert response to blob then to File object
      const blob = await response.blob()
      const file = new File([blob], 'ScheduleSample.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      // Use the same file processing logic as upload
      setFileToProcess(file)
      // Don't reset loading state here since file processing will handle it
    } catch (error) {
      console.error('Error loading sample data:', error)
      showToast('error', 'Failed to load sample data', 'Please try again or upload your own file.')
      setIsLoading(false) // Only reset on error
    }
  }


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{ backgroundImage: 'url(/Field.png)' }}
        />
        <div className="text-center bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 max-w-md w-full relative z-10">
          {isParsingFile ? (
            <>
              <span className="text-6xl mx-auto mb-4 block" style={{ animation: 'soccerBallBounce 1s ease-in-out infinite' }}>⚽</span>
              <h2 className="text-xl font-semibold text-green-800 mb-2">Parsing Excel File...</h2>
              <p className="text-gray-600 mb-6">Processing your schedule data in the background</p>
              <ProgressBar 
                progress={parseProgress} 
                label={
                  parseProgress < 30 ? 'Setting up the team...' :
                  parseProgress < 50 ? 'Planning the matches...' :
                  parseProgress < 90 ? 'Organizing the lineup...' :
                  'Final whistle approaching...'
                }
                className="mb-4"
              />
              <p className="text-sm text-gray-500">Using Web Worker for optimal performance</p>
            </>
          ) : (
            <>
              <div className="relative">
                <span className="text-6xl mx-auto block" style={{ animation: 'soccerBallRoll 2s linear infinite' }}>⚽</span>
              </div>
              <h2 className="mt-6 text-xl font-semibold text-green-800">Preparing the field...</h2>
              <p className="mt-2 text-gray-600">Loading schedule data and warming up</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <span className="text-2xl" style={{ animation: 'soccerBallBounce 0.6s ease-in-out infinite' }}>⚽</span>
                <span className="text-2xl" style={{ animation: 'soccerBallBounce 0.6s ease-in-out infinite', animationDelay: '0.2s' }}>⚽</span>
                <span className="text-2xl" style={{ animation: 'soccerBallBounce 0.6s ease-in-out infinite', animationDelay: '0.4s' }}>⚽</span>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <SchedulerLandingPage
        onUploadFile={() => {
          document.getElementById('file-upload')?.click()
        }}
        onLoadSample={handleLoadSampleData}
      />
      <input
        id="file-upload"
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="sr-only"
      />
    </>
  )
}