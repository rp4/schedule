'use client'

import { Download, Brain } from 'lucide-react'
import Link from 'next/link'
import { useScheduleStore } from '@/store/useScheduleStore'
import { exportToExcel } from '@/lib/excel/exporter'
import { OptimizationModal } from '@/components/features/optimization/OptimizationModal'
import { useState, useMemo } from 'react'
import { showToast } from '@/components/ui/Toast'

export function Header() {
  const [showOptimization, setShowOptimization] = useState(false)
  const employees = useScheduleStore((state) => state.employees)
  const projects = useScheduleStore((state) => state.projects)
  const assignments = useScheduleStore((state) => state.assignments)
  const skills = useScheduleStore((state) => state.skills)
  const teams = useScheduleStore((state) => state.teams)
  
  const scheduleData = useMemo(() => ({
    employees,
    projects,
    assignments,
    skills,
    teams,
  }), [employees, projects, assignments, skills, teams])

  const handleExport = async () => {
    try {
      await exportToExcel(scheduleData)
    } catch {
      showToast('error', 'Export failed', 'Unable to export Excel file. Please try again.')
    }
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-green-100 sticky top-0 z-40 goal-net-pattern">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link 
                href="/" 
                className="btn-icon group"
                title="Home"
              >
                <span className="text-2xl group-hover:animate-spin inline-block">⚽</span>
              </Link>
              <Link href="/" className="text-heading hover:text-green-600 transition-colors">
                Team Scheduler
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {/* Optimize Button */}
              <button
                onClick={() => setShowOptimization(true)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                Optimize Schedule
              </button>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Excel
              </button>
            </div>
          </div>
        </div>
      </header>

      {showOptimization && (
        <OptimizationModal onClose={() => setShowOptimization(false)} />
      )}
    </>
  )
}