'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, ShoppingBag, Receipt, Package, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import MovementForm from './movement-form'

const ACTIONS = [
  { label: 'Nueva venta', icon: ShoppingBag, href: '/sales', color: 'text-success' },
  { label: 'Nuevo gasto', icon: Receipt, href: '/expenses', color: 'text-danger' },
  { label: 'Nueva compra', icon: Package, href: '/purchases', color: 'text-warning' },
  { label: 'Movimiento', icon: Wallet, action: 'movement' as const, color: 'text-blue' },
]

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false)
  const [showMovement, setShowMovement] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleAction = (action: typeof ACTIONS[number]) => {
    setOpen(false)
    if (action.action === 'movement') {
      setShowMovement(true)
    } else if (action.href) {
      router.push(action.href)
    }
  }

  return (
    <>
      <div ref={menuRef} className="fixed bottom-5 right-5 z-40 md:bottom-7 md:right-7">
        {open && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-1.5 min-w-44">
            {ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  onClick={() => handleAction(action)}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card border border-border shadow-lg hover:bg-muted transition-all duration-150 text-sm font-medium text-foreground animate-slide-up"
                >
                  <Icon size={15} className={action.color} strokeWidth={1.8} />
                  {action.label}
                </button>
              )
            })}
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="w-12 h-12 rounded-xl bg-blue text-white shadow-[0_4px_16px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-150 flex items-center justify-center"
          title="Acciones rápidas"
        >
          <Plus size={20} strokeWidth={2.2} className={`transition-transform duration-200 ${open ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {showMovement && <MovementForm onClose={() => setShowMovement(false)} />}
    </>
  )
}
