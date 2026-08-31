'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-danger/[0.08] flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={20} className="text-danger" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground mb-1">
          Ocurrió un error al cargar esta página.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono mb-4">
            Error: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <RefreshCw size={12} />
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
