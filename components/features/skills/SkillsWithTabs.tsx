'use client'

import { useState, useEffect } from 'react'
import { SkillsMatrix } from './SkillsMatrix'
import { SkillsByProject } from './SkillsByProject'
import { ViewModeToggle, type ViewMode } from '@/components/ui/ViewModeToggle'

export function SkillsWithTabs() {
  const [activeTab, setActiveTab] = useState<ViewMode>('employee')

  // Read subview from URL on mount and when hash changes
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      const subview = params.get('subview')
      
      if (subview === 'project') {
        setActiveTab('project')
      } else {
        setActiveTab('employee')
      }
    }

    // Check on mount
    checkHash()

    // Listen for hash changes
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  const handleTabChange = (tab: ViewMode) => {
    setActiveTab(tab)
    
    // Update URL to reflect the subview
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    params.set('subview', tab)
    window.location.hash = params.toString()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab buttons */}
      <div className="mb-4">
        <ViewModeToggle viewMode={activeTab} onViewModeChange={handleTabChange} />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'employee' ? <SkillsMatrix /> : <SkillsByProject />}
      </div>
    </div>
  )
}