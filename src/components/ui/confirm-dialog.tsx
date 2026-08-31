'use client'

import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title, message, confirmLabel = 'Eliminar', cancelLabel = 'Cancelar',
  danger = true, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card rounded-xl border border-border shadow-[0_20px_60px_rgba(0,0,0,0.12)] w-full sm:max-w-sm mx-2 sm:mx-4 p-5 animate-scale-in">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${danger ? 'bg-danger/[0.08]' : 'bg-warning/[0.08]'}`}>
            <AlertTriangle size={16} className={danger ? 'text-danger' : 'text-warning'} />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors ${danger ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-primary/90'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
