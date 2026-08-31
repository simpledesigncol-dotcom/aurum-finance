'use client'

import { FileQuestion } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <FileQuestion size={20} className="text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Página no encontrada</h2>
        <p className="text-sm text-muted-foreground mb-4">
          La ruta que buscas no existe.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  )
}
