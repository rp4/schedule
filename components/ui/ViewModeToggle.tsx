'use client'

import React from 'react'
import { Users, Briefcase } from 'lucide-react'

export type ViewMode = 'employee' | 'project'

interface ViewModeToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex bg-gray-50 rounded-lg p-1">
      <button
        onClick={() => onViewModeChange('employee')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
          viewMode === 'employee'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Users className="w-4 h-4" />
        By Employee
      </button>
      <button
        onClick={() => onViewModeChange('project')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
          viewMode === 'project'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Briefcase className="w-4 h-4" />
        By Project
      </button>
    </div>
  )
}