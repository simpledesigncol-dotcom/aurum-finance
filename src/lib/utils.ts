import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getAgingBucket(dueDate: Date | string): string {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'current'
  if (diffDays <= 30) return '1_30'
  if (diffDays <= 60) return '31_60'
  if (diffDays <= 90) return '61_90'
  return '90_plus'
}

export function getDaysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getHealthScore(items: { severity: string }[]): number {
  if (items.length === 0) return 100
  const critical = items.filter(i => i.severity === 'critical').length * 10
  const warning = items.filter(i => i.severity === 'warning').length * 3
  return Math.max(0, 100 - critical - warning)
}
