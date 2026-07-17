'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}

export default function Modal({ title, subtitle, onClose, children, wide }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-card rounded-xl border border-border shadow-[0_20px_60px_rgba(0,0,0,0.12)] w-full ${wide ? 'max-w-lg' : 'max-w-md'} sm:mx-4 mx-2 max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-scale-in`}>
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold truncate">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(90vh-60px)]">
          {children}
        </div>
      </div>
    </div>
  )
}
