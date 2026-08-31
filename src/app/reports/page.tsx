'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Download,
  Receipt, FileSpreadsheet, FileText, BarChart3, Users, Building2,
  CreditCard, Wallet, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import { formatCurrency, formatDate, formatNumber, getAgingBucket } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import * as XLSX from 'xlsx'

interface Movement {
  id: string
  movementType: string
  amount: number
  direction: string
  movementDate: string
  description: string | null
  sourceType: string
  paymentType: string | null
  category: { id: string; name: string } | null
  contact: { id: string; name: string } | null
  workOrder: { id: string; orderNumber: string } | null
  metadata: string | null
}

interface WorkOrder {
  id: string
  orderNumber: string
  vehiclePlate: string | null
  vehicleInfo: string | null
  contact: { name: string } | null
  saleAmount: number
  costAmount: number
  status: string
  createdAt: string
}

const isIncoming = (m: Movement) => m.direction === 'in' && m.movementType !== 'transfer'
const isOutgoing = (m: Movement) => m.direction === 'out' && m.movementType !== 'transfer'

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  cash: 'Efectivo', transfer: 'Transferencia', td: 'Tarjeta débito', tc: 'Tarjeta crédito',
  datafono: 'Datáfono', nequi: 'Nequi', daviplata: 'Daviplata', pse: 'PSE',
  cheque: 'Cheque', credit: 'Crédito', partial: 'Pago parcial', qr: 'QR',
}

function movementPaymentType(m: Movement): string | null {
  if (!m.metadata) return null
  try {
    const parsed = JSON.parse(m.metadata)
    const pt = parsed.paymentType
    return pt ? PAYMENT_TYPE_LABELS[pt] || pt : null
  } catch {
    return null
  }
}

interface AgingAccount {
  id: string
  description: string | null
  originalAmount: number
  paidAmount: number
  balance: number
  dueDate: string
  status: string
  contact?: { name: string } | null
}

interface BankAccount {
  id: string
  bankName: string
  accountType: string | null
  accountNumber: string | null
  balance: number
}

interface RegisterBalance {
  id: string
  name: string
  type: string
  balance: number
}

const periods = [
  { id: 'month', label: 'Mes' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'year', label: 'Año' },
]

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const sections = [
  { id: 'cashflow', label: 'Flujo de caja', icon: BarChart3 },
  { id: 'income', label: 'Ingresos', icon: TrendingUp },
  { id: 'expenses', label: 'Gastos', icon: TrendingDown },
  { id: 'suppliers', label: 'Proveedores', icon: Users },
  { id: 'profitability', label: 'Rentabilidad OT', icon: Receipt },
  { id: 'receivables', label: 'Cuentas por cobrar', icon: ArrowDownLeft },
  { id: 'payables', label: 'Cuentas por pagar', icon: ArrowUpRight },
  { id: 'accounts', label: 'Dinero por cuenta', icon: Wallet },
  { id: 'payment_methods', label: 'Medios de pago', icon: CreditCard },
  { id: 'comparison', label: 'Comparativo mensual', icon: BarChart3 },
]

function MiniBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
            <div className="font-medium">{d.label}: {formatCurrency(d.value)}</div>
          </div>
          <div
            className="w-full rounded-[3px] transition-colors duration-150"
            style={{
              height: `${Math.max((d.value / maxVal) * 100, 2)}%`,
              backgroundColor: color,
            }}
          />
        </div>
      ))}
    </div>
  )
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 animate-slide-up">
      <div className="mb-4">
        <h3 className="font-semibold text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export default function ReportsPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [receivables, setReceivables] = useState<AgingAccount[]>([])
  const [payables, setPayables] = useState<AgingAccount[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [cashRegisters, setCashRegisters] = useState<{ general?: RegisterBalance; minor?: RegisterBalance } | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [exportOpen, setExportOpen] = useState(false)
  const [sortField, setSortField] = useState<'profit' | 'margin'>('profit')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    cashflow: true, income: true, expenses: true, suppliers: false,
    profitability: true, receivables: false, payables: false,
    accounts: false, payment_methods: false, comparison: false,
  })
  const exportRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [movRes, woRes, arRes, apRes, banksRes, regsRes] = await Promise.all([
        fetch('/api/movements?limit=9999'),
        fetch('/api/work-orders?limit=9999'),
        fetch('/api/accounts-receivable'),
        fetch('/api/accounts-payable'),
        fetch('/api/bank-accounts'),
        fetch('/api/cash-register/default'),
      ])
      const movData = await movRes.json()
      const woData = await woRes.json()
      const arData = await arRes.json()
      const apData = await apRes.json()
      const banksData = await banksRes.json()
      const regsData = await regsRes.json()
      setMovements(Array.isArray(movData.movements) ? movData.movements : [])
      setWorkOrders(Array.isArray(woData.orders) ? woData.orders : [])
      setReceivables(Array.isArray(arData) ? arData : [])
      setPayables(Array.isArray(apData) ? apData : [])
      setBankAccounts(Array.isArray(banksData) ? banksData : [])
      setCashRegisters(regsData && regsData.general ? regsData : null)
    } catch {
      console.error('Error fetching report data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const now = new Date()
  const getStartOfPeriod = () => {
    switch (period) {
      case 'quarter':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      case 'year':
        return new Date(now.getFullYear(), 0, 1)
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1)
    }
  }

  const startOfPeriod = getStartOfPeriod()
  const prevPeriodStart = new Date(startOfPeriod)
  if (period === 'month') prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 1)
  else if (period === 'quarter') prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 3)
  else prevPeriodStart.setFullYear(prevPeriodStart.getFullYear() - 1)

  const periodMovements = movements.filter((m) => new Date(m.movementDate) >= startOfPeriod)
  const prevPeriodMovements = movements.filter(
    (m) => {
      const d = new Date(m.movementDate)
      return d >= prevPeriodStart && d < startOfPeriod
    }
  )

  const totalIncome = periodMovements.filter(isIncoming).reduce((s, m) => s + m.amount, 0)
  const totalExpenses = periodMovements.filter(isOutgoing).reduce((s, m) => s + m.amount, 0)
  const netFlow = totalIncome - totalExpenses
  const prevIncome = prevPeriodMovements.filter(isIncoming).reduce((s, m) => s + m.amount, 0)
  const prevExpenses = prevPeriodMovements.filter(isOutgoing).reduce((s, m) => s + m.amount, 0)
  const prevNet = prevIncome - prevExpenses
  const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0
  const expenseChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0

  const barData: { label: string; income: number; expenses: number }[] = []
  if (period === 'year') {
    for (let i = 0; i < 12; i++) {
      const mStart = new Date(now.getFullYear(), i, 1)
      const mEnd = new Date(now.getFullYear(), i + 1, 1)
      const mm = movements.filter((mt) => {
        const d = new Date(mt.movementDate)
        return d >= mStart && d < mEnd
      })
      barData.push({
        label: monthNames[i],
        income: mm.filter(isIncoming).reduce((s, mt) => s + mt.amount, 0),
        expenses: mm.filter(isOutgoing).reduce((s, mt) => s + mt.amount, 0),
      })
    }
  } else if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    for (let i = 0; i < 3; i++) {
      const mStart = new Date(now.getFullYear(), q * 3 + i, 1)
      const mEnd = new Date(now.getFullYear(), q * 3 + i + 1, 1)
      const mm = movements.filter((mt) => {
        const d = new Date(mt.movementDate)
        return d >= mStart && d < mEnd
      })
      barData.push({
        label: monthNames[q * 3 + i],
        income: mm.filter(isIncoming).reduce((s, mt) => s + mt.amount, 0),
        expenses: mm.filter(isOutgoing).reduce((s, mt) => s + mt.amount, 0),
      })
    }
  } else {
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    let weekStart = new Date(mStart)
    let weekNum = 1
    while (weekStart < mEnd) {
      const wEnd = new Date(weekStart)
      wEnd.setDate(wEnd.getDate() + 7)
      const wm = movements.filter((m) => {
        const d = new Date(m.movementDate)
        return d >= weekStart && d < (wEnd < mEnd ? wEnd : mEnd)
      })
      barData.push({
        label: `S${weekNum}`,
        income: wm.filter(isIncoming).reduce((s, m) => s + m.amount, 0),
        expenses: wm.filter(isOutgoing).reduce((s, m) => s + m.amount, 0),
      })
      weekStart = new Date(wEnd)
      weekNum++
    }
  }

  const expenseCategories = new Map<string, { total: number; count: number }>()
  periodMovements.filter(isOutgoing).forEach((m) => {
    const key = m.category?.name || 'Sin categoría'
    const existing = expenseCategories.get(key) || { total: 0, count: 0 }
    existing.total += m.amount
    existing.count++
    expenseCategories.set(key, existing)
  })
  const sortedExpenseCategories = Array.from(expenseCategories.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
  const totalCatExpenses = sortedExpenseCategories.reduce((s, c) => s + c.total, 0)

  const incomeCategories = new Map<string, { total: number; count: number }>()
  periodMovements.filter(isIncoming).forEach((m) => {
    const key = m.category?.name || 'Sin categoría'
    const existing = incomeCategories.get(key) || { total: 0, count: 0 }
    existing.total += m.amount
    existing.count++
    incomeCategories.set(key, existing)
  })
  const sortedIncomeCategories = Array.from(incomeCategories.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)

  const contactIncome = new Map<string, number>()
  periodMovements.filter((m) => isIncoming(m) && m.contact).forEach((m) => {
    const name = m.contact!.name
    contactIncome.set(name, (contactIncome.get(name) || 0) + m.amount)
  })
  const topClients = Array.from(contactIncome.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const supplierExpenses = new Map<string, { total: number; count: number }>()
  periodMovements.filter((m) => isOutgoing(m) && m.contact).forEach((m) => {
    const name = m.contact!.name
    const existing = supplierExpenses.get(name) || { total: 0, count: 0 }
    existing.total += m.amount
    existing.count++
    supplierExpenses.set(name, existing)
  })
  const topSuppliers = Array.from(supplierExpenses.entries()).sort((a, b) => b[1].total - a[1].total).slice(0, 10)

  const woProfitability = workOrders.map((wo) => {
    const woMovements = movements.filter((m) => m.workOrder?.id === wo.id)
    const income = woMovements.filter(isIncoming).reduce((s, m) => s + m.amount, 0)
    const cost = woMovements.filter(isOutgoing).reduce((s, m) => s + m.amount, 0)
    const profit = income - cost
    const margin = income > 0 ? (profit / income) * 100 : 0
    return { ...wo, income, cost, profit, margin }
  })
  const sortedProfitability = [...woProfitability].sort((a, b) => {
    const valA = a[sortField]
    const valB = b[sortField]
    return sortDir === 'desc' ? valB - valA : valA - valB
  })

  const paymentBreakdown = new Map<string, { total: number; count: number }>()
  periodMovements.forEach((m) => {
    const key = movementPaymentType(m) || 'Sin definir'
    const existing = paymentBreakdown.get(key) || { total: 0, count: 0 }
    existing.total += m.amount
    existing.count++
    paymentBreakdown.set(key, existing)
  })
  const sortedPayments = Array.from(paymentBreakdown.entries()).sort((a, b) => b[1].total - a[1].total)

  const prevMonthData: { label: string; income: number; expenses: number }[] = []
  if (period === 'month') {
    for (let i = 5; i >= 0; i--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const mm = movements.filter((mt) => {
        const d = new Date(mt.movementDate)
        return d >= mDate && d < mEnd
      })
      prevMonthData.push({
        label: monthNames[mDate.getMonth()],
        income: mm.filter(isIncoming).reduce((s, mt) => s + mt.amount, 0),
        expenses: mm.filter(isOutgoing).reduce((s, mt) => s + mt.amount, 0),
      })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const mm = movements.filter((mt) => {
        const d = new Date(mt.movementDate)
        return d >= mDate && d < mEnd
      })
      prevMonthData.push({
        label: `${monthNames[mDate.getMonth()]} ${mDate.getFullYear().toString().slice(2)}`,
        income: mm.filter(isIncoming).reduce((s, mt) => s + mt.amount, 0),
        expenses: mm.filter(isOutgoing).reduce((s, mt) => s + mt.amount, 0),
      })
    }
  }

  const toggleSort = (field: 'profit' | 'margin') => {
    if (sortField === field) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const paymentLabel = (id: string): string => {
    const labels: Record<string, string> = {
      cash: 'Efectivo', transfer: 'Transferencia', td: 'T. Débito',
      tc: 'T. Crédito', datafono: 'Datáfono', nequi: 'Nequi',
      daviplata: 'Daviplata', pse: 'PSE', cheque: 'Cheque',
      credit: 'Crédito', qr: 'QR',
    }
    return labels[id] || id
  }

  const periodLabel = periods.find((p) => p.id === period)?.label || ''

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()

    const summaryData = [
      [`Aurum Finance — Reporte ${periodLabel}`],
      [],
      ['Resumen del período'],
      ['Indicador', 'Valor', 'Periodo anterior', 'Cambio'],
      ['Ingresos', totalIncome, prevIncome, `${incomeChange.toFixed(1)}%`],
      ['Gastos', totalExpenses, prevExpenses, `${expenseChange.toFixed(1)}%`],
      ['Flujo neto', netFlow, prevNet, ''],
      ['Flujo caja'],
      ['Periodo', 'Ingresos', 'Gastos'],
      ...barData.map((d) => [d.label, d.income, d.expenses]),
      [],
      ['Categorías de gasto'],
      ['Categoría', 'Total', 'Transacciones', '% del total'],
      ...sortedExpenseCategories.map((c) => [c.name, c.total, c.count, totalCatExpenses > 0 ? `${((c.total / totalCatExpenses) * 100).toFixed(1)}%` : '0%']),
      [],
      ['Top proveedores'],
      ['Proveedor', 'Total', 'Transacciones'],
      ...topSuppliers.map(([name, data]) => [name, data.total, data.count]),
      [],
      ['Rentabilidad por OT'],
      ['OT', 'Vehículo', 'Cliente', 'Ingresos', 'Costo', 'Ganancia', 'Margen'],
      ...sortedProfitability.map((wo) => [
        wo.orderNumber,
        wo.vehiclePlate || wo.vehicleInfo || '-',
        wo.contact?.name || '-',
        wo.income,
        wo.cost,
        wo.profit,
        `${wo.margin.toFixed(1)}%`,
      ]),
      [],
      ['Medios de pago'],
      ['Medio', 'Total', 'Transacciones'],
      ...sortedPayments.map(([id, data]) => [paymentLabel(id), data.total, data.count]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(summaryData)
    ws['!cols'] = [
      { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
      { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte')

    const movSheet = XLSX.utils.aoa_to_sheet([
      ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Contacto', 'Dirección', 'Monto', 'Medio de pago'],
      ...periodMovements.map((m) => [
        formatDate(m.movementDate),
        m.movementType,
        m.description || '',
        m.category?.name || '',
        m.contact?.name || '',
        m.direction === 'in' ? 'Ingreso' : 'Egreso',
        m.direction === 'in' ? m.amount : -m.amount,
        movementPaymentType(m) || 'Sin definir',
      ]),
    ])
    movSheet['!cols'] = [
      { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 20 },
      { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, movSheet, 'Movimientos')

    XLSX.writeFile(wb, `Reporte_${periodLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast('success', 'Excel descargado correctamente')
    setExportOpen(false)
  }

  const exportPdf = () => {
    toast('info', 'Se abrirá el diálogo de impresión. Elige "Guardar como PDF"')
    setExportOpen(false)
    setTimeout(() => window.print(), 300)
  }

  if (loading) {
    return (
      <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-6 w-28 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border p-5 space-y-3">
              <div className="h-4 w-36 bg-muted rounded animate-pulse" />
              <div className="h-48 bg-muted/50 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-header { text-align: center; padding: 20px 0; border-bottom: 2px solid #2563eb; margin-bottom: 24px; }
          .print-header h1 { font-size: 22px; font-weight: 700; color: #111; margin: 0; }
          .print-header p { font-size: 13px; color: #666; margin: 4px 0 0; }
          .print-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
          .print-table th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-weight: 600; border: 1px solid #e5e7eb; }
          .print-table td { padding: 6px 10px; border: 1px solid #e5e7eb; }
          .print-table tr:nth-child(even) { background: #f9fafb; }
          .print-section-title { font-size: 14px; font-weight: 600; margin: 16px 0 8px; }
          .print-footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
          @page { margin: 20mm 15mm; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Análisis financiero completo</p>
        </div>
        <div className="flex items-center gap-2 relative" ref={exportRef}>
          <div className="flex items-center bg-muted rounded-lg p-[3px]">
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
                  period === p.id
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={() => setExportOpen(!exportOpen)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            <Download size={13} />
            Exportar
          </button>
          {exportOpen && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
              <button onClick={exportExcel} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium hover:bg-muted transition-colors text-left">
                <FileSpreadsheet size={15} className="text-success" />
                <div>
                  <p className="text-sm">Excel</p>
                  <p className="text-[10px] text-muted-foreground">Reporte completo en .xlsx</p>
                </div>
              </button>
              <div className="h-px bg-border" />
              <button onClick={exportPdf} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium hover:bg-muted transition-colors text-left">
                <FileText size={15} className="text-danger" />
                <div>
                  <p className="text-sm">PDF</p>
                  <p className="text-[10px] text-muted-foreground">Versión para imprimir/enviar</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ingresos</span>
            <div className="w-7 h-7 rounded-lg bg-success/[0.08] flex items-center justify-center">
              <ArrowDownLeft size={14} className="text-success" />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums tracking-tight text-success">{formatCurrency(totalIncome)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {periodMovements.filter(isIncoming).length} transacciones
            {incomeChange !== 0 && (
              <span className={`ml-1 font-medium ${incomeChange > 0 ? 'text-success' : 'text-danger'}`}>
                {incomeChange > 0 ? '↑' : '↓'}{Math.abs(incomeChange).toFixed(1)}%
              </span>
            )}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gastos</span>
            <div className="w-7 h-7 rounded-lg bg-danger/[0.08] flex items-center justify-center">
              <ArrowUpRight size={14} className="text-danger" />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums tracking-tight text-danger">{formatCurrency(totalExpenses)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {periodMovements.filter(isOutgoing).length} transacciones
            {expenseChange !== 0 && (
              <span className={`ml-1 font-medium ${expenseChange > 0 ? 'text-danger' : 'text-success'}`}>
                {expenseChange > 0 ? '↑' : '↓'}{Math.abs(expenseChange).toFixed(1)}%
              </span>
            )}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Flujo neto</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${netFlow >= 0 ? 'bg-success/[0.08]' : 'bg-danger/[0.08]'}`}>
              {netFlow >= 0 ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-danger" />}
            </div>
          </div>
          <p className={`text-xl font-bold tabular-nums tracking-tight ${netFlow >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(netFlow)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {totalIncome > 0 ? `${((totalExpenses / totalIncome) * 100).toFixed(1)}% gasto/ingreso` : '—'}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Promedio gasto</span>
            <div className="w-7 h-7 rounded-lg bg-warning/[0.08] flex items-center justify-center">
              <Receipt size={14} className="text-warning" />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums tracking-tight">
            {formatCurrency(
              periodMovements.filter(isOutgoing).length > 0
                ? totalExpenses / periodMovements.filter(isOutgoing).length
                : 0
            )}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Ingreso: {formatCurrency(
              periodMovements.filter(isIncoming).length > 0
                ? totalIncome / periodMovements.filter(isIncoming).length
                : 0
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <SectionCard title="Flujo de caja" subtitle={`Ingresos vs gastos por ${period === 'month' ? 'semana' : period === 'quarter' ? 'mes' : 'mes'}`}>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success/70" />Ingresos</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger/70" />Gastos</span>
          </div>
          {barData.length > 0 ? (
            <div className="flex items-end gap-1 h-48 px-1 overflow-x-auto">
              {barData.map((d, i) => {
                const maxVal = Math.max(...barData.map((x) => Math.max(x.income, x.expenses)), 1)
                const incomeH = (d.income / maxVal) * 100
                const expenseH = (d.expenses / maxVal) * 100
                return (
                  <div key={i} className="flex-1 min-w-[32px] flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-foreground text-white text-[10px] px-2.5 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                      <div className="font-medium mb-0.5">{d.label}</div>
                      <div className="text-success font-medium">+{formatCurrency(d.income)}</div>
                      <div className="text-danger font-medium">-{formatCurrency(d.expenses)}</div>
                    </div>
                    <div className="w-full flex gap-[3px] items-end" style={{ height: '100%' }}>
                      <div className="flex-1 rounded-[3px] bg-success/60 hover:bg-success transition-colors duration-150" style={{ height: `${Math.max(incomeH, 1)}%` }} />
                      <div className="flex-1 rounded-[3px] bg-danger/40 hover:bg-danger/60 transition-colors duration-150" style={{ height: `${Math.max(expenseH, 1)}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">{d.label}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Sin datos para este periodo</div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <span className="text-[10px] text-muted-foreground uppercase block">Total ingresos</span>
              <p className="text-sm font-bold tabular-nums text-success">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <span className="text-[10px] text-muted-foreground uppercase block">Total gastos</span>
              <p className="text-sm font-bold tabular-nums text-danger">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <span className="text-[10px] text-muted-foreground uppercase block">Neto</span>
              <p className={`text-sm font-bold tabular-nums ${netFlow >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(netFlow)}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Ingresos por período" subtitle="Desglose por categoría y clientes principales">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-3">Por categoría</h4>
              {sortedIncomeCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sin ingresos en este periodo</p>
              ) : (
                <div className="space-y-2.5">
                  {sortedIncomeCategories.slice(0, 8).map((cat, i) => {
                    const maxCat = sortedIncomeCategories[0]?.total || 1
                    const totalCatIncome = sortedIncomeCategories.reduce((s, c) => s + c.total, 0)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate max-w-[160px]">{cat.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">{cat.count} txn</span>
                            <span className="text-xs tabular-nums font-medium text-success">{formatCurrency(cat.total)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-success/50 rounded-full transition-all" style={{ width: `${(cat.total / maxCat) * 100}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{totalCatIncome > 0 ? ((cat.total / totalCatIncome) * 100).toFixed(1) : 0}% del total</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-3">Top clientes</h4>
              {topClients.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sin datos de clientes</p>
              ) : (
                <div className="space-y-2.5">
                  {topClients.map(([name, amount], i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-success/[0.08] text-success text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="text-xs font-medium truncate max-w-[180px]">{name}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-success">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Gastos por categoría" subtitle="Desglose detallado con porcentajes">
          {sortedExpenseCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin gastos en este periodo</p>
          ) : (
            <div className="space-y-3">
              {sortedExpenseCategories.map((cat, i) => {
                const pct = totalCatExpenses > 0 ? (cat.total / totalCatExpenses) * 100 : 0
                const color = i === 0 ? 'bg-danger' : i === 1 ? 'bg-red-400' : i === 2 ? 'bg-red-300' : 'bg-red-200'
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-xs font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">{cat.count} txn</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{pct.toFixed(1)}%</span>
                        <span className="text-xs font-semibold tabular-nums text-danger">{formatCurrency(cat.total)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${color}/50`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs font-semibold">Total gastos</span>
                <span className="text-sm font-bold tabular-nums text-danger">{formatCurrency(totalCatExpenses)}</span>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Gastos por proveedor" subtitle="Principales proveedores por monto">
          {topSuppliers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin datos de proveedores</p>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {topSuppliers.map(([name, data], i) => {
                const pct = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="w-6 h-6 rounded-full bg-danger/[0.08] text-danger text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{name}</p>
                      <p className="text-[10px] text-muted-foreground">{data.count} transacciones · {pct.toFixed(1)}% del total</p>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-danger shrink-0">{formatCurrency(data.total)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Rentabilidad por OT" subtitle="Órdenes de trabajo con ingreso, costo y margen">
          {sortedProfitability.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin órdenes de trabajo</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">OT</th>
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Vehículo</th>
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-right py-2 pr-3 font-medium text-muted-foreground">Ingresos</th>
                    <th className="text-right py-2 pr-3 font-medium text-muted-foreground">Costo</th>
                    <th className="text-right py-2 pr-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort('profit')}>
                      Ganancia {sortField === 'profit' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                    <th className="text-right py-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort('margin')}>
                      Margen {sortField === 'margin' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProfitability.map((wo) => (
                    <tr key={wo.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-3 font-medium">{wo.orderNumber}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{wo.vehiclePlate || wo.vehicleInfo || '—'}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground truncate max-w-[140px]">{wo.contact?.name || '—'}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-success">{formatCurrency(wo.income)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-danger">{formatCurrency(wo.cost)}</td>
                      <td className={`py-2.5 pr-3 text-right tabular-nums font-medium ${wo.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(wo.profit)}
                      </td>
                      <td className={`py-2.5 text-right tabular-nums font-medium ${wo.margin >= 0 ? 'text-success' : 'text-danger'}`}>
                        {wo.margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Cuentas por cobrar" subtitle="Envejecimiento según fecha de vencimiento">
            <AgingSummary type="receivable" accounts={receivables} />
          </SectionCard>
          <SectionCard title="Cuentas por pagar" subtitle="Envejecimiento según fecha de vencimiento">
            <AgingSummary type="payable" accounts={payables} />
          </SectionCard>
        </div>

        <SectionCard title="Dinero por cuenta" subtitle="Saldos reales en cajas y cuentas bancarias">
          <MoneyByAccount bankAccounts={bankAccounts} cashRegisters={cashRegisters} />
        </SectionCard>

        <SectionCard title="Medios de pago" subtitle="Distribución por forma de cobro/pago">
          {sortedPayments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin datos de medios de pago</p>
          ) : (
            <div className="space-y-3">
              {sortedPayments.map(([id, data], i) => {
                const pct = periodMovements.length > 0 ? (data.count / periodMovements.length) * 100 : 0
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{paymentLabel(id)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">{data.count} txn</span>
                        <span className="text-xs font-semibold tabular-nums">{formatCurrency(data.total)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue/40 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Comparativo mensual" subtitle="Evolución de ingresos y gastos en los últimos meses">
          {prevMonthData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success/70" />Ingresos</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger/70" />Gastos</span>
              </div>
              <div className="flex items-end gap-1 h-32">
                {prevMonthData.map((d, i) => {
                  const maxVal = Math.max(...prevMonthData.map((x) => Math.max(x.income, x.expenses)), 1)
                  return (
                    <div key={i} className="flex-1 min-w-[28px] flex flex-col items-center gap-0.5 group relative">
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-foreground text-white text-[10px] px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        <div className="font-medium">{d.label}</div>
                        <div className="text-success">+{formatCurrency(d.income)}</div>
                        <div className="text-danger">-{formatCurrency(d.expenses)}</div>
                      </div>
                      <div className="w-full flex gap-[2px] items-end" style={{ height: '100%' }}>
                        <div className="flex-1 rounded-[3px] bg-success/60 hover:bg-success transition-colors" style={{ height: `${Math.max((d.income / maxVal) * 100, 1)}%` }} />
                        <div className="flex-1 rounded-[3px] bg-danger/40 hover:bg-danger/60 transition-colors" style={{ height: `${Math.max((d.expenses / maxVal) * 100, 1)}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{d.label}</span>
                    </div>
                  )
                })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {prevMonthData.slice(-2).map((d, i) => (
                  <div key={i} className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <span className="text-[10px] text-muted-foreground block">{d.label}</span>
                    <p className={`text-sm font-bold tabular-nums ${d.income - d.expenses >= 0 ? 'text-success' : 'text-danger'}`}>
                      Neto: {formatCurrency(d.income - d.expenses)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="print-only">
        <div className="print-header">
          <h1>Aurum Finance — Reporte {periodLabel}</h1>
          <p>Generado el {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="print-section-title">Resumen</div>
        <table className="print-table">
          <tbody>
            <tr><td>Ingresos</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(totalIncome)}</td></tr>
            <tr><td>Gastos</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(totalExpenses)}</td></tr>
            <tr><td>Flujo neto</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(netFlow)}</td></tr>
          </tbody>
        </table>
        <div className="print-section-title">Movimientos del período</div>
        <table className="print-table">
          <thead>
            <tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Contacto</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Monto</th></tr>
          </thead>
          <tbody>
            {periodMovements.slice(0, 50).map((m) => (
              <tr key={m.id}>
                <td>{formatDate(m.movementDate)}</td>
                <td>{m.description || m.movementType}</td>
                <td>{m.category?.name || '-'}</td>
                <td>{m.contact?.name || '-'}</td>
                <td>{m.direction === 'in' ? 'Ingreso' : 'Egreso'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{m.direction === 'in' ? '' : '-'}{formatCurrency(m.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="print-footer">Aurum Finance — Reporte generado automáticamente</div>
      </div>
    </div>
  )
}

function AgingSummary({
  type,
  accounts,
}: {
  type: 'receivable' | 'payable'
  accounts: AgingAccount[]
}) {
  const totalOriginal = accounts.reduce((s, a) => s + (a.originalAmount || 0), 0)
  const totalPaid = accounts.reduce((s, a) => s + (a.paidAmount || 0), 0)
  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  const bucketDefs = [
    { key: 'current', label: 'Por vencer', color: 'bg-emerald-500' },
    { key: '1_30', label: 'Vencido 1-30', color: 'bg-amber-500' },
    { key: '31_60', label: 'Vencido 31-60', color: 'bg-orange-500' },
    { key: '61_90', label: 'Vencido 61-90', color: 'bg-red-400' },
    { key: '90_plus', label: 'Vencido +90', color: 'bg-red-600' },
  ]

  const bucketMap = new Map<string, number>()
  accounts.forEach((a) => {
    const key = getAgingBucket(a.dueDate)
    bucketMap.set(key, (bucketMap.get(key) || 0) + (a.balance || 0))
  })

  const buckets = bucketDefs.map((b) => ({ ...b, amount: bucketMap.get(b.key) || 0 }))
  const overdue = buckets.filter((b) => b.key !== 'current').reduce((s, b) => s + b.amount, 0)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
          <span className="text-[10px] text-muted-foreground uppercase block">Total emitido</span>
          <p className="text-sm font-bold tabular-nums">{formatCurrency(totalOriginal)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
          <span className="text-[10px] text-muted-foreground uppercase block">{type === 'receivable' ? 'Cobrado' : 'Pagado'}</span>
          <p className="text-sm font-bold tabular-nums text-success">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
          <span className="text-[10px] text-muted-foreground uppercase block">Pendiente</span>
          <p className="text-sm font-bold tabular-nums text-warning">{formatCurrency(totalBalance)}</p>
        </div>
      </div>
      <div className="space-y-2">
        {buckets.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color.includes('emerald') ? '#10b981' : b.color.includes('amber') ? '#f59e0b' : b.color.includes('orange') ? '#f97316' : b.color.includes('red') && b.color.includes('600') ? '#dc2626' : '#f87171' }} />
            <span className="text-[11px] text-muted-foreground w-24 shrink-0">{b.label}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${totalBalance > 0 ? (b.amount / totalBalance) * 100 : 0}%`, backgroundColor: b.color.includes('emerald') ? '#10b981' : b.color.includes('amber') ? '#f59e0b' : b.color.includes('orange') ? '#f97316' : b.color.includes('red') && b.color.includes('600') ? '#dc2626' : '#f87171' }} />
            </div>
            <span className="text-[11px] font-medium tabular-nums w-20 text-right">{formatCurrency(b.amount)}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <span className="w-2 h-2 rounded-full shrink-0 bg-red-500" />
          <span className="text-[11px] font-medium text-muted-foreground w-24 shrink-0">Total vencido</span>
          <div className="flex-1" />
          <span className="text-[11px] font-bold tabular-nums w-20 text-right text-danger">{formatCurrency(overdue)}</span>
        </div>
      </div>
    </div>
  )
}

function MoneyByAccount({
  bankAccounts,
  cashRegisters,
}: {
  bankAccounts: BankAccount[]
  cashRegisters: { general?: RegisterBalance; minor?: RegisterBalance } | null
}) {
  const rows: { label: string; sub: string; balance: number }[] = []

  const general = cashRegisters?.general
  const minor = cashRegisters?.minor
  if (general || minor) {
    rows.push({
      label: 'Caja',
      sub: 'Efectivo (General + Menor)',
      balance: (general?.balance || 0) + (minor?.balance || 0),
    })
  }
  bankAccounts.forEach((a) => {
    rows.push({
      label: a.bankName,
      sub: a.accountNumber ? `Cuenta ${a.accountNumber}` : 'Cuenta bancaria',
      balance: a.balance || 0,
    })
  })

  const total = rows.reduce((s, r) => s + r.balance, 0)

  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Sin datos de cuentas</p>
  }

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          <div className="w-8 h-8 rounded-lg bg-blue/[0.08] flex items-center justify-center shrink-0">
            <Wallet size={14} className="text-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">{r.label}</p>
            <p className="text-[10px] text-muted-foreground">{r.sub}</p>
          </div>
          <span className={`text-sm font-bold tabular-nums shrink-0 ${r.balance >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(r.balance)}
          </span>
        </div>
      ))}
      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-xs font-semibold">Total disponible</span>
        <span className={`text-sm font-bold tabular-nums ${total >= 0 ? 'text-success' : 'text-danger'}`}>
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  )
}
