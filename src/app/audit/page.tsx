export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/utils'
import { ShieldCheck, User, FileText, Settings, DollarSign } from 'lucide-react'

async function getAuditLogs() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
    },
  })

  return logs
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  financial_movement: DollarSign,
  sale: DollarSign,
  expense: DollarSign,
  purchase: FileText,
  obligation: FileText,
  user: User,
}

export default async function AuditPage() {
  const logs = await getAuditLogs()

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Registro de actividad del sistema</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Registro de actividad</h2>
        </div>
        <div className="divide-y divide-border">
          {logs.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={18} className="text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Sin registros de auditoria</p>
              <p className="text-xs text-muted-foreground mt-0.5">Las acciones se registraran automaticamente</p>
            </div>
          ) : (
            logs.map((log) => {
              const Icon = ENTITY_ICONS[log.entityType] || Settings
              return (
                <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors duration-150">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      <span className="capitalize">{log.action}</span>
                      {' '}
                      <span className="text-muted-foreground">{log.entityType.replace('_', ' ')}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.user?.name || 'Sistema'} · ID: {log.entityId.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
