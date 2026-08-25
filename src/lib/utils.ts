import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const TIMEZONE = 'America/Bogota'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function toBogota(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date
  const utc = d.getTime() + d.getTimezoneOffset() * 60000
  const bogota = new Date(utc - (-5 * 3600000))
  return bogota
}

export function formatCurrency(amount: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('es-CO').format(amount)
}

export function formatDate(date: Date | string): string {
  const d = toBogota(date)
  return format(d, "d 'de' MMM, yyyy", { locale: es })
}

export function formatDateTime(date: Date | string): string {
  const d = toBogota(date)
  const day = format(d, "d 'de' MMM yyyy", { locale: es })
  const time = format(d, 'h:mm a', { locale: es })
  return `${day} · ${time}`
}

export function formatTime(date: Date | string): string {
  const d = toBogota(date)
  return format(d, 'h:mm a', { locale: es })
}

export function formatShortDate(date: Date | string): string {
  const d = toBogota(date)
  if (isToday(d)) return 'Hoy'
  if (isYesterday(d)) return 'Ayer'
  return format(d, "d 'de' MMM", { locale: es })
}

export function formatRelativeTime(date: Date | string): string {
  const d = toBogota(date)
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

export function getAgingBucket(dueDate: Date | string): string {
  const now = startOfDay(new Date())
  const due = startOfDay(toBogota(dueDate))
  const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'current'
  if (diffDays <= 30) return '1_30'
  if (diffDays <= 60) return '31_60'
  if (diffDays <= 90) return '61_90'
  return '90_plus'
}

export function getDaysUntil(date: Date | string): number {
  const now = startOfDay(new Date())
  const target = startOfDay(toBogota(date))
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getHealthScore(items: { severity: string }[]): number {
  let score = 100
  for (const item of items) {
    if (item.severity === 'critical') score -= 10
    else if (item.severity === 'warning') score -= 3
  }
  return Math.max(0, Math.min(100, score))
}

export function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const bogota = toBogota(now)

  switch (period) {
    case 'today':
      return { start: startOfDay(bogota), end: endOfDay(bogota) }
    case 'week':
      return { start: startOfWeek(bogota, { weekStartsOn: 1 }), end: endOfWeek(bogota, { weekStartsOn: 1 }) }
    case 'month':
      return { start: startOfMonth(bogota), end: endOfMonth(bogota) }
    case 'quarter':
      return { start: startOfQuarter(bogota), end: endOfQuarter(bogota) }
    case 'year':
      return { start: startOfYear(bogota), end: endOfYear(bogota) }
    case '7days':
      return { start: startOfDay(subDays(bogota, 6)), end: endOfDay(bogota) }
    case '30days':
      return { start: startOfDay(subDays(bogota, 29)), end: endOfDay(bogota) }
    default:
      return { start: startOfMonth(bogota), end: endOfMonth(bogota) }
  }
}

export function movementTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    income: 'Ingreso',
    expense: 'Gasto',
    transfer: 'Transferencia',
    sale: 'Venta',
    purchase: 'Compra',
    ar_payment: 'Cobro CxC',
    ap_payment: 'Pago CxP',
    obligation_payment: 'Pago deuda',
    obligation_received: 'Préstamo',
    capital_contribution: 'Aporte capital',
    adjustment: 'Ajuste',
  }
  return labels[type] || type
}

export function movementTypeColor(type: string): string {
  const colors: Record<string, string> = {
    income: 'text-emerald-600 bg-emerald-50',
    expense: 'text-red-600 bg-red-50',
    transfer: 'text-blue-600 bg-blue-50',
    sale: 'text-emerald-600 bg-emerald-50',
    purchase: 'text-amber-600 bg-amber-50',
    ar_payment: 'text-emerald-600 bg-emerald-50',
    ap_payment: 'text-red-600 bg-red-50',
    obligation_payment: 'text-red-600 bg-red-50',
    obligation_received: 'text-blue-600 bg-blue-50',
    capital_contribution: 'text-emerald-600 bg-emerald-50',
    adjustment: 'text-slate-600 bg-slate-50',
  }
  return colors[type] || 'text-slate-600 bg-slate-50'
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed: 'Confirmado',
    pending: 'Pendiente',
    draft: 'Borrador',
    cancelled: 'Anulado',
    open: 'Abierta',
    in_progress: 'En proceso',
    completed: 'Completada',
    closed: 'Cerrada',
    paid: 'Pagado',
    partial: 'Parcial',
  }
  return labels[status] || status
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    confirmed: 'text-emerald-600 bg-emerald-50',
    pending: 'text-amber-600 bg-amber-50',
    draft: 'text-slate-500 bg-slate-50',
    cancelled: 'text-red-600 bg-red-50',
    open: 'text-blue-600 bg-blue-50',
    in_progress: 'text-amber-600 bg-amber-50',
    completed: 'text-emerald-600 bg-emerald-50',
    closed: 'text-slate-500 bg-slate-50',
    paid: 'text-emerald-600 bg-emerald-50',
    partial: 'text-amber-600 bg-amber-50',
  }
  return colors[status] || 'text-slate-600 bg-slate-50'
}
