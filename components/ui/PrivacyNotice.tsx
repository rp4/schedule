'use client'

import { useState, useEffect } from 'react'
import { Shield, Info, Database } from 'lucide-react'

export function PrivacyNotice() {
  const [isVisible, setIsVisible] = useState(false)
  const [hasAccepted, setHasAccepted] = useState(false)

  useEffect(() => {
    // Check if user has already accepted the privacy notice
    const accepted = localStorage.getItem('privacy-notice-accepted')
    if (!accepted) {
      setIsVisible(true)
    } else {
      setHasAccepted(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('privacy-notice-accepted', 'true')
    setHasAccepted(true)
    setIsVisible(false)
  }

  const handleLearnMore = () => {
    // Scroll to privacy section in README or show more details
    window.open('https://github.com/rp4/Scheduler#-privacy--security', '_blank')
  }

  if (!isVisible || hasAccepted) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full animate-fade-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Privacy & Data Storage Notice
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <Database className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 mb-1">
                  Browser-Based Storage
                </h3>
                <p className="text-sm text-gray-600">
                  This application stores all schedule data locally in your browser&apos;s localStorage. 
                  No data is ever sent to any server.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 mb-1">
                  What This Means
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Your data stays on this device only</li>
                  <li>• Clearing browser data will delete your schedules</li>
                  <li>• Different browsers/devices won&apos;t share data</li>
                  <li>• We cannot recover lost data</li>
                </ul>
              </div>
            </div>

          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleLearnMore}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Learn More
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}