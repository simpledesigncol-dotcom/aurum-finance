import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      select: { id: true, orderNumber: true, companyId: true },
    })

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      )
    }

    const movements = await prisma.financialMovement.findMany({
      where: { workOrderId: id },
      orderBy: { occurredAt: 'desc' },
      include: {
        category: true,
        contact: true,
        creator: { select: { name: true, email: true } },
      },
    })

    const totalIncome = movements
      .filter((m) => m.direction === 'in')
      .reduce((sum, m) => sum + m.amount, 0)

    const totalCosts = movements
      .filter((m) => m.direction === 'out')
      .reduce((sum, m) => sum + m.amount, 0)

    const profit = totalIncome - totalCosts
    const margin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0

    const byCategory = movements.reduce(
      (acc, m) => {
        const catName = m.category?.name || 'Sin categoria'
        if (!acc[catName]) {
          acc[catName] = { income: 0, costs: 0, count: 0 }
        }
        acc[catName].count += 1
        if (m.direction === 'in') {
          acc[catName].income += m.amount
        } else {
          acc[catName].costs += m.amount
        }
        return acc
      },
      {} as Record<string, { income: number; costs: number; count: number }>
    )

    const byType = movements.reduce(
      (acc, m) => {
        if (!acc[m.movementType]) {
          acc[m.movementType] = { total: 0, count: 0, direction: m.direction }
        }
        acc[m.movementType].total += m.amount
        acc[m.movementType].count += 1
        return acc
      },
      {} as Record<string, { total: number; count: number; direction: string }>
    )

    const arBalance = await prisma.accountsReceivable.aggregate({
      where: { workOrderId: id },
      _sum: { balance: true, originalAmount: true, paidAmount: true },
      _count: true,
    })

    return NextResponse.json({
      workOrder: {
        id: workOrder.id,
        orderNumber: workOrder.orderNumber,
      },
      movements,
      totalIncome,
      totalCosts,
      profit,
      margin,
      byCategory,
      byType,
      accountsReceivable: {
        totalOriginal: arBalance._sum.originalAmount || 0,
        totalPaid: arBalance._sum.paidAmount || 0,
        totalBalance: arBalance._sum.balance || 0,
        count: arBalance._count,
      },
    })
  } catch (error) {
    console.error('Error fetching work order financials:', error)
    return NextResponse.json(
      { error: 'Error al obtener los movimientos de la orden de trabajo' },
      { status: 500 }
    )
  }
}
