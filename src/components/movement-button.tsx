'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import MovementForm from './movement-form'

export default function MovementButton({ registerId }: { registerId?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Plus size={16} />
        Registrar movimiento
      </button>

      {open && <MovementForm registerId={registerId} onClose={() => setOpen(false)} />}
    </>
  )
}
