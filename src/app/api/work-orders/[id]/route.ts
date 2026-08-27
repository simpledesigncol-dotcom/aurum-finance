import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        contact: true,
        financialMovements: {
          orderBy: { movementDate: 'desc' },
          include: {
            category: true,
            contact: true,
          },
        },
        sales: {
          include: {
            items: true,
            payments: true,
          },
        },
        creator: { select: { name: true, email: true } },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      )
    }

    const income = order.financialMovements
      .filter(m => m.direction === 'in' && m.status === 'confirmed')
      .reduce((sum, m) => sum + Number(m.amount), 0)

    const costs = order.financialMovements
      .filter(m => m.direction === 'out' && m.status === 'confirmed')
      .reduce((sum, m) => sum + Number(m.amount), 0)

    const totalPaid = order.sales.reduce((sum, s) => sum + s.amountPaid, 0)
    const totalSales = order.sales.reduce((sum, s) => sum + s.total, 0)
    const pendingReceivable = totalSales - totalPaid

    const profit = income - costs
    const margin = income > 0 ? (profit / income) * 100 : 0

    return NextResponse.json({
      ...order,
      financials: {
        income,
        costs,
        profit,
        margin,
        pendingReceivable: Math.max(0, pendingReceivable),
      },
    })
  } catch (error) {
    console.error('Error fetching work order:', error)
    return NextResponse.json({ error: 'Error al cargar la orden' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const order = await prisma.workOrder.update({
      where: { id },
      data: {
        ...(body.contactId !== undefined && { contactId: body.contactId || null }),
        ...(body.vehiclePlate !== undefined && { vehiclePlate: body.vehiclePlate || null }),
        ...(body.vehicleInfo !== undefined && { vehicleInfo: body.vehicleInfo || null }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.saleAmount !== undefined && { saleAmount: parseFloat(body.saleAmount) }),
        ...(body.costAmount !== undefined && { costAmount: parseFloat(body.costAmount) }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating work order:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la orden de trabajo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.financialMovement.updateMany({
      where: { workOrderId: id },
      data: { workOrderId: null },
    })

    await prisma.workOrder.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting work order:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la orden de trabajo' },
      { status: 500 }
    )
  }
}
