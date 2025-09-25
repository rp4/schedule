'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastProps {
  toast: ToastMessage
  onClose: (id: string) => void
}

function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, 5000)

    return () => clearTimeout(timer)
  }, [toast.id, onClose])

  const icons = {
    success: <span className="text-2xl">🏆</span>,
    error: <span className="text-2xl">🟥</span>,
    info: <span className="text-2xl">📣</span>,
  }

  const styles = {
    success: 'bg-green-50 border-green-300 trophy-complete',
    error: 'bg-red-50 border-red-300 red-card-error',
    info: 'bg-yellow-50 border-yellow-300 yellow-card-warning',
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg animate-slide-up ${
        styles[toast.type]
      }`}
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-sm text-gray-600">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  )
}

// Toast Container
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Listen for custom toast events
  useEffect(() => {
    const handleToast = (event: CustomEvent<Omit<ToastMessage, 'id'>>) => {
      const newToast: ToastMessage = {
        ...event.detail,
        id: Date.now().toString(),
      }
      setToasts((prev) => [...prev, newToast])
    }

    window.addEventListener('show-toast' as any, handleToast)
    return () => window.removeEventListener('show-toast' as any, handleToast)
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  )
}

// Helper function to show toast
export function showToast(type: ToastType, title: string, message?: string) {
  const event = new CustomEvent('show-toast', {
    detail: { type, title, message },
  })
  window.dispatchEvent(event)
}