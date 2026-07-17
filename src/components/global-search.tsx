'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowUpRight, FileText, DollarSign, Users, Scale, Receipt, Package } from 'lucide-react'

interface SearchResult {
  id: string
  type: string
  title: string
  subtitle: string
  url: string
  amount?: number
  date?: string
  status?: string
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  movement: DollarSign,
  sale: DollarSign,
  expense: Receipt,
  purchase: Package,
  contact: Users,
  obligation: Scale,
  receivable: ArrowUpRight,
  payable: ArrowUpRight,
  document: FileText,
}

const TYPE_LABELS: Record<string, string> = {
  movement: 'Movimiento',
  sale: 'Venta',
  expense: 'Gasto',
  purchase: 'Compra',
  contact: 'Contacto',
  obligation: 'Obligacion',
  receivable: 'CxC',
  payable: 'CxP',
  document: 'Documento',
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => search(query), 200)
    return () => clearTimeout(debounce)
  }, [query, search])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setSelected(0)
    }
  }, [open])

  useEffect(() => {
    setSelected(0)
  }, [results])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && results[selected]) {
      router.push(results[selected].url)
      setOpen(false)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-2.5 py-[7px] rounded-lg bg-muted border border-border text-muted-foreground text-xs hover:border-border hover:bg-muted/80 transition-all duration-150"
      >
        <Search size={12} strokeWidth={1.8} />
        <span>Buscar...</span>
        <kbd className="ml-auto text-[10px] text-muted-foreground/60 bg-card px-1.5 py-[2px] rounded border border-border font-mono">⌘K</kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />

      <div className="relative bg-card rounded-xl border border-border shadow-[0_24px_80px_rgba(0,0,0,0.12)] w-full max-w-lg mx-4 overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search size={16} className="text-muted-foreground shrink-0" strokeWidth={1.8} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar movimientos, ventas, contactos..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-[2px] rounded border border-border font-mono">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-4 py-8 text-center">
              <div className="w-4 h-4 border-[1.5px] border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">Buscando...</p>
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Sin resultados para &quot;{query}&quot;</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-1">
              {results.map((result, i) => {
                const Icon = TYPE_ICONS[result.type] || FileText
                return (
                  <button
                    key={result.id}
                    onClick={() => {
                      router.push(result.url)
                      setOpen(false)
                    }}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors duration-100 ${
                      i === selected ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon size={13} className="text-muted-foreground" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{result.title}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-[2px] rounded shrink-0 font-medium">
                          {TYPE_LABELS[result.type] || result.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                    {result.amount != null && (
                      <span className="text-sm font-semibold tabular-nums shrink-0">
                        {formatAmount(result.amount)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">Escribe al menos 2 caracteres para buscar</p>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground font-medium">
          <span>navegar</span>
          <span>abrir</span>
          <span>cerrar</span>
        </div>
      </div>
    </div>
  )
}
