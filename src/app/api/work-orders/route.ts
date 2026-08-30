import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [orders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          contact: { select: { id: true, name: true } },
          _count: { select: { financialMovements: true } },
          sales: { select: { id: true, total: true, balanceDue: true } },
        },
      }),
      prisma.workOrder.count({ where }),
    ])

    const enriched = await Promise.all(
      orders.map(async (order) => {
        const saleTotal = order.sales.reduce((sum, s) => sum + s.total, 0)
        const pendingReceivable = order.sales.reduce((sum, s) => sum + s.balanceDue, 0)
        const movements = await prisma.financialMovement.findMany({
          where: { workOrderId: order.id, status: 'confirmed' },
          select: { amount: true, direction: true },
        })
        const movementIncome = movements
          .filter((m) => m.direction === 'in')
          .reduce((sum, m) => sum + m.amount, 0)
        const movementCosts = movements
          .filter((m) => m.direction === 'out')
          .reduce((sum, m) => sum + m.amount, 0)

        const income = order.saleAmount || saleTotal || movementIncome
        const costs = order.costAmount || movementCosts
        const profit = income - costs

        return {
          ...order,
          financials: {
            income,
            costs,
            profit,
            margin: income > 0 ? (profit / income) * 100 : 0,
            pendingReceivable,
          },
        }
      })
    )

    return NextResponse.json({
      orders: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error fetching work orders:', error)
    return NextResponse.json({ orders: [], pagination: { page: 1, limit: 100, total: 0, pages: 0 } })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      contactId, vehiclePlate, vehicleInfo, description,
      saleAmount, costAmount, startDate, endDate,
    } = body

    const companyId = body.companyId || 'default'
    const createdBy = body.createdBy || 'default-user'

    const lastOrder = await prisma.workOrder.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    })

    let nextNumber = 1
    if (lastOrder) {
      const match = lastOrder.orderNumber.match(/(\d+)$/)
      if (match) nextNumber = parseInt(match[1]) + 1
    }
    const orderNumber = `OT-${String(nextNumber).padStart(4, '0')}`

    const order = await prisma.workOrder.create({
      data: {
        companyId,
        orderNumber,
        contactId: contactId || null,
        vehiclePlate: vehiclePlate || null,
        vehicleInfo: vehicleInfo || null,
        description: description || null,
        status: 'open',
        saleAmount: saleAmount || 0,
        costAmount: costAmount || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy,
      },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating work order:', error)
    return NextResponse.json(
      { error: 'Error al crear la orden de trabajo' },
      { status: 500 }
    )
  }
}
