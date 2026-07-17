import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sourceType = searchParams.get('sourceType')
  const movementType = searchParams.get('movementType')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (sourceType) where.sourceType = sourceType
  if (movementType) where.movementType = movementType
  if (status) where.status = status

  const [movements, total] = await Promise.all([
    prisma.financialMovement.findMany({
      where,
      orderBy: { movementDate: 'desc' },
      skip,
      take: limit,
      include: {
        category: true,
        contact: true,
        creator: { select: { name: true, email: true } },
        documents: true,
      },
    }),
    prisma.financialMovement.count({ where }),
  ])

  return NextResponse.json({
    movements,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      movementType,
      amount,
      direction,
      movementDate,
      categoryId,
      description,
      sourceType,
      sourceId,
      contactId,
      referenceType,
      referenceId,
      receiptNumber,
      notes,
      createdBy,
      status,
    } = body

    if (!movementType || !amount || !direction || !sourceType || !sourceId || !createdBy) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes' },
        { status: 400 }
      )
    }

    const transactionId = await generateTransactionId()

    const movement = await prisma.financialMovement.create({
      data: {
        transactionId,
        companyId: body.companyId || 'default',
        status: status || 'confirmed',
        movementType,
        amount: parseFloat(amount),
        direction,
        movementDate: movementDate ? new Date(movementDate) : new Date(),
        categoryId: categoryId || null,
        description,
        sourceType,
        sourceId,
        contactId: contactId || null,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        receiptNumber: receiptNumber || null,
        notes: notes || null,
        createdBy,
      },
    })

    await prisma.auditLog.create({
      data: {
        companyId: body.companyId || 'default',
        userId: createdBy,
        action: 'create',
        entityType: 'financial_movement',
        entityId: movement.id,
        newValues: JSON.stringify(movement),
      },
    })

    return NextResponse.json(movement, { status: 201 })
  } catch (error) {
    console.error('Error creating movement:', error)
    return NextResponse.json(
      { error: 'Error al crear el movimiento' },
      { status: 500 }
    )
  }
}
