'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import MovementForm from './movement-form'

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-xl bg-blue text-white shadow-[0_4px_16px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-150 flex items-center justify-center md:bottom-7 md:right-7"
        title="Registrar movimiento"
      >
        <Plus size={20} strokeWidth={2.2} />
      </button>

      {open && <MovementForm onClose={() => setOpen(false)} />}
    </>
  )
}
