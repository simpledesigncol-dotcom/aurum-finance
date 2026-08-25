import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getCashRegisterBalance } from '@/lib/balances'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const registerId = searchParams.get('registerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (registerId) where.registerId = registerId

    const [reconciliations, total] = await Promise.all([
      prisma.cashReconciliation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          register: { select: { id: true, name: true } },
          reconciler: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.cashReconciliation.count({ where }),
    ])

    return NextResponse.json({
      reconciliations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching reconciliations:', error)
    return NextResponse.json(
      { error: 'Error al obtener las conciliaciones' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { registerId, physicalCount, notes, reconciledById } = body

    if (!registerId || physicalCount == null) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: registerId, physicalCount' },
        { status: 400 }
      )
    }

    const register = await prisma.cashRegister.findUnique({ where: { id: registerId } })
    if (!register) {
      return NextResponse.json(
        { error: 'Caja no encontrada' },
        { status: 404 }
      )
    }

    const systemBalance = await getCashRegisterBalance(registerId)
    const difference = physicalCount - systemBalance
    const userId = reconciledById || register.closedById || 'default-user'

    const reconciliation = await prisma.cashReconciliation.create({
      data: {
        registerId,
        systemBalance,
        physicalCount: parseFloat(physicalCount),
        difference,
        notes: notes || null,
        reconciledById: userId,
      },
      include: {
        register: { select: { id: true, name: true } },
        reconciler: { select: { id: true, name: true, email: true } },
      },
    })

    await prisma.cashRegister.update({
      where: { id: registerId },
      data: {
        physicalCount: parseFloat(physicalCount),
        difference,
      },
    })

    await prisma.auditLog.create({
      data: {
        companyId: register.companyId,
        userId,
        action: 'create',
        entityType: 'cash_reconciliation',
        entityId: reconciliation.id,
        newValues: JSON.stringify(reconciliation),
      },
    })

    return NextResponse.json(reconciliation, { status: 201 })
  } catch (error) {
    console.error('Error creating reconciliation:', error)
    return NextResponse.json(
      { error: 'Error al crear la conciliacion' },
      { status: 500 }
    )
  }
}
