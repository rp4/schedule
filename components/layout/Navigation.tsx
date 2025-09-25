'use client'

import { usePathname } from 'next/navigation'
import { Calendar, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { DateRangeFilter } from '@/components/features/filters/DateRangeFilter'
import { useScheduleStore } from '@/store/useScheduleStore'

const tabs = [
  { id: 'gantt', label: 'Gantt Chart', icon: Calendar },
  { id: 'hours', label: 'Hours', icon: Clock },
  { id: 'skills', label: 'Skills', icon: User },
]

export function Navigation() {
  const pathname = usePathname()
  const [currentView, setCurrentView] = useState('gantt')
  const selectedTeam = useScheduleStore((state) => state.selectedTeam)
  const setSelectedTeam = useScheduleStore((state) => state.setSelectedTeam)
  const teams = useScheduleStore((state) => state.teams)
  
  useEffect(() => {
    // Get view from URL hash for static export
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      setCurrentView(params.get('view') || 'gantt')
    }
    
    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Only show navigation on schedule page
  if (!pathname.includes('/schedule')) return null

  const handleTabClick = (tabId: string) => {
    // Update the hash without causing a page reload
    window.location.hash = `view=${tabId}`
  }

  return (
    <div className="bg-white shadow-sm border-b border-green-100">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center">
          {/* Navigation Tabs */}
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = currentView === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-4 font-medium transition-all duration-200 border-b-3 relative',
                    isActive
                      ? 'text-blue-700 border-blue-600 bg-gradient-to-t from-blue-50 to-transparent'
                      : 'text-gray-600 border-transparent hover:text-blue-600 hover:bg-blue-50/30'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
          
          {/* Filters */}
          <div className="flex items-center gap-4">
            {/* Date Range Filter */}
            <DateRangeFilter />
            
            {/* Team Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="team-select" className="text-caption font-medium">
                Team:
              </label>
              <select
                id="team-select"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="select-base text-sm min-w-[120px]"
              >
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}