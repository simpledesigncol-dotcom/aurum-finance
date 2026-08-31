'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface Contact { id: string; name: string }

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function WorkOrderForm({ onClose, onCreated }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleInfo, setVehicleInfo] = useState('')
  const [contactId, setContactId] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    fetch('/api/contacts')
      .then(r => r.json())
      .then(d => setContacts(d.contacts || d || []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiclePlate: vehiclePlate || null,
          vehicleInfo: vehicleInfo || null,
          contactId: contactId || null,
          description: description || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear')
      }
      onCreated()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl border border-border shadow-[0_20px_60px_rgba(0,0,0,0.12)] w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Nueva Orden de Trabajo</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Placa</label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                placeholder="ABC 123"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Vehículo</label>
              <input
                type="text"
                value={vehicleInfo}
                onChange={e => setVehicleInfo(e.target.value)}
                placeholder="Marca, modelo..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Cliente</label>
            <select
              value={contactId}
              onChange={e => setContactId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40"
            >
              <option value="">Sin cliente</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalle del trabajo..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue/40 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/[0.04] border border-danger/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? 'Creando...' : 'Crear OT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
