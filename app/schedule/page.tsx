'use client'

import { useState, useEffect } from 'react'
import { GanttChart } from '@/components/features/gantt/GanttChart'
import { HoursGrid } from '@/components/features/hours/HoursGrid'
import { SkillsWithTabs } from '@/components/features/skills/SkillsWithTabs'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function SchedulePage() {
  const [view, setView] = useState<string>('gantt')
  
  useEffect(() => {
    // Get view from URL hash instead of search params for static export
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      setView(params.get('view') || 'gantt')
    }
    
    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <div className="card animate-fade-in">
      <ErrorBoundary>
        {view === 'gantt' && <GanttChart />}
        {view === 'hours' && <HoursGrid />}
        {view === 'skills' && <SkillsWithTabs />}
      </ErrorBoundary>
    </div>
  )
}