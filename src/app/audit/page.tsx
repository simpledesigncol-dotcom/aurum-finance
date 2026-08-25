export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'
import AuditTimeline from './audit-timeline'

export type AuditLogData = {
  id: string
  action: string
  entityType: string
  entityId: string
  userId: string | null
  oldValues: string | null
  newValues: string | null
  ipAddress: string | null
  createdAt: Date
  user: { name: string } | null
}

async function getAuditData() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { name: true } },
    },
  })

  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return { logs, users }
}

export default async function AuditPage() {
  const { logs, users } = await getAuditData()

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Registro visual de actividad del sistema</p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={22} className="text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium">Sin registros de auditoría</p>
          <p className="text-xs text-muted-foreground mt-0.5">Las acciones se registrarán automáticamente</p>
        </div>
      ) : (
        <AuditTimeline logs={logs as AuditLogData[]} users={users} />
      )}
    </div>
  )
}
