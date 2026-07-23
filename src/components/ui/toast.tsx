'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { X, Check, AlertTriangle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const ICONS = {
  success: Check,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
}

const STYLES = {
  success: 'bg-success/[0.12] border-success/20 text-success',
  error: 'bg-danger/[0.12] border-danger/20 text-danger',
  warning: 'bg-warning/[0.12] border-warning/20 text-warning',
  info: 'bg-blue/[0.12] border-blue/20 text-blue',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => {
          const Icon = ICONS[t.type]
          return (
            <div
              key={t.id}
              className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm bg-card animate-slide-up ${STYLES[t.type]}`}
            >
              <Icon size={15} className="shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-xs font-medium flex-1">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
