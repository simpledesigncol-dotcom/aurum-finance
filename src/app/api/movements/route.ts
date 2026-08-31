import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'
import { resolvePaymentSource } from '@/lib/payment-sources'
import { getDateRange } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface MovementFilters {
  sourceType?: string
  movementType?: string
  status?: string
  categoryId?: string
  contactId?: string
  workOrderId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  paymentType?: string
  quickFilter?: string
  page: number
  limit: number
}

function buildWhere(filters: MovementFilters) {
  const where: Record<string, unknown> = {}

  if (filters.sourceType) where.sourceType = filters.sourceType
  if (filters.movementType) where.movementType = filters.movementType
  if (filters.status) where.status = filters.status
  if (filters.categoryId) where.categoryId = filters.categoryId
  if (filters.contactId) where.contactId = filters.contactId
  if (filters.workOrderId) where.workOrderId = filters.workOrderId

  if (filters.paymentType) {
    where.metadata = { contains: `"paymentType":"${filters.paymentType}"` }
  }

  if (filters.search) {
    const searchCondition = {
      OR: [
        { transactionId: { contains: filters.search, mode: 'insensitive' as const } },
        { description: { contains: filters.search, mode: 'insensitive' as const } },
        { notes: { contains: filters.search, mode: 'insensitive' as const } },
        { contact: { name: { contains: filters.search, mode: 'insensitive' as const } } },
        { category: { name: { contains: filters.search, mode: 'insensitive' as const } } },
      ],
    }
    if (where.OR) {
      where.AND = [searchCondition, { OR: where.OR }]
      delete where.OR
    } else {
      Object.assign(where, searchCondition)
    }
  }

  if (filters.dateFrom || filters.dateTo) {
    where.occurredAt = {}
    if (filters.dateFrom) {
      (where.occurredAt as Record<string, Date>).gte = new Date(filters.dateFrom)
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      to.setHours(23, 59, 59, 999)
      ;(where.occurredAt as Record<string, Date>).lte = to
    }
  }

  if (filters.quickFilter) {
    const range = getDateRange(filters.quickFilter)
    switch (filters.quickFilter) {
      case 'today':
      case 'week':
      case 'month':
        where.occurredAt = { gte: range.start, lte: range.end }
        break
      case 'no-ot':
        where.workOrderId = null
        break
      case 'no-receipt':
        where.OR = [
          { receiptNumber: null },
          { receiptNumber: '' },
        ]
        break
      case 'cash':
        where.sourceType = 'cash_register'
        break
      case 'pending':
        where.status = 'pending'
        break
    }
  }

  return where
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const filters: MovementFilters = {
      sourceType: searchParams.get('sourceType') || undefined,
      movementType: searchParams.get('movementType') || undefined,
      status: searchParams.get('status') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      contactId: searchParams.get('contactId') || undefined,
      workOrderId: searchParams.get('workOrderId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      search: searchParams.get('search') || undefined,
      paymentType: searchParams.get('paymentType') || undefined,
      quickFilter: searchParams.get('quickFilter') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    }

    const where = buildWhere(filters)
    const skip = (filters.page - 1) * filters.limit

    const [movements, total] = await Promise.all([
      prisma.financialMovement.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: filters.limit,
        include: {
          category: true,
          contact: true,
          creator: { select: { name: true, email: true } },
          workOrder: { select: { id: true, orderNumber: true } },
        },
      }),
      prisma.financialMovement.count({ where }),
    ])

    return NextResponse.json({
      movements,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    })
  } catch (error) {
    console.error('Error fetching movements:', error)
    return NextResponse.json(
      { error: 'Error al obtener los movimientos' },
      { status: 500 }
    )
  }
}

async function resolveOrCreateContact(
  name: string | null,
  type: string,
  companyId: string
): Promise<string | null> {
  if (!name) return null

  const existing = await prisma.contact.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' as const },
      companyId,
    },
    select: { id: true },
  })
  if (existing) return existing.id

  const contact = await prisma.contact.create({
    data: { name, type, companyId },
  })
  return contact.id
}

function movementTypeToContactType(movementType: string): string {
  const map: Record<string, string> = {
    sale: 'client',
    purchase: 'supplier',
    obligation_received: 'supplier',
    obligation_payment: 'supplier',
    ar_payment: 'client',
    ap_payment: 'supplier',
    income: 'other',
    expense: 'other',
    transfer: 'other',
    capital_contribution: 'other',
    adjustment: 'other',
  }
  return map[movementType] || 'other'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      movementType,
      amount,
      direction,
      movementDate,
      occurredAt,
      categoryId,
      description,
      sourceType,
      sourceId,
      contactId,
      contactName,
      paymentType,
      notes,
      createdBy,
      status,
      workOrderId,
      receiptNumber,
    } = body

    if (!movementType || !amount || !direction) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: movementType, amount, direction' },
        { status: 400 }
      )
    }

    if (!sourceType || !sourceId) {
      return NextResponse.json(
        { error: 'Debes indicar la cuenta (caja o banco) a la que va este movimiento (sourceType, sourceId)' },
        { status: 400 }
      )
    }

    if (movementType === 'transfer') {
      return NextResponse.json(
        { error: 'Las transferencias se crean de forma atómica con POST /api/transfers' },
        { status: 400 }
      )
    }

    const companyId = body.companyId || 'default'
    const userId = createdBy || 'default-user'
    const parsedAmount = parseFloat(amount)
    const parsedDate = movementDate ? new Date(movementDate) : new Date()
    const parsedOccurrence = occurredAt ? new Date(occurredAt) : parsedDate

    const resolvedContactId =
      contactId || (await resolveOrCreateContact(contactName, movementTypeToContactType(movementType), companyId))

    const { sourceType: resolvedSourceType, sourceId: resolvedSourceId } = await resolvePaymentSource(
      paymentType || null,
      companyId
    )

    const transactionId = await generateTransactionId()

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.financialMovement.create({
        data: {
        transactionId,
        companyId,
        status: status || 'confirmed',
        movementType,
        amount: parsedAmount,
        direction,
        occurredAt: parsedOccurrence,
        movementDate: parsedDate,
        categoryId: categoryId || null,
        description,
        sourceType: sourceType || resolvedSourceType,
        sourceId: sourceId || resolvedSourceId,
        contactId: resolvedContactId,
        workOrderId: workOrderId || null,
        receiptNumber: receiptNumber || null,
        notes: notes || null,
        metadata: paymentType ? JSON.stringify({ paymentType }) : null,
        createdBy: userId,
      },
    })

    let refType: string | null = null
    let refId: string | null = null

    switch (movementType) {
      case 'income': {
        refType = 'income'
        refId = movement.id
        break
      }

      case 'expense': {
        const expense = await tx.expense.create({
          data: {
            companyId,
            amount: parsedAmount,
            description,
            expenseDate: parsedDate,
            contactId: resolvedContactId,
            categoryId: categoryId || null,
            workOrderId: workOrderId || null,
            financialMovementId: movement.id,
            createdBy: userId,
          },
        })
        refType = 'expense'
        refId = expense.id
        break
      }

      case 'transfer':
        break

      case 'sale': {
        const sale = await tx.sale.create({
          data: {
            companyId,
            contactId: resolvedContactId,
            workOrderId: workOrderId || null,
            saleDate: parsedDate,
            status: 'completed',
            paymentType: paymentType || 'cash',
            subtotal: parsedAmount,
            total: parsedAmount,
            amountPaid: parsedAmount,
            source: 'manual',
            createdBy: userId,
          },
        })

        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            amount: parsedAmount,
            paymentDate: parsedDate,
            financialMovementId: movement.id,
            createdBy: userId,
          },
        })

        refType = 'sale'
        refId = sale.id
        break
      }

      case 'purchase': {
        const purchase = await tx.purchase.create({
          data: {
            companyId,
            contactId: resolvedContactId,
            workOrderId: workOrderId || null,
            purchaseDate: parsedDate,
            purchaseType: 'other',
            subtotal: parsedAmount,
            total: parsedAmount,
            paymentType: paymentType || 'cash',
            amountPaid: parsedAmount,
            status: 'completed',
            createdBy: userId,
          },
        })

        await tx.purchasePayment.create({
          data: {
            purchaseId: purchase.id,
            amount: parsedAmount,
            paymentDate: parsedDate,
            financialMovementId: movement.id,
            createdBy: userId,
          },
        })

        refType = 'purchase'
        refId = purchase.id
        break
      }

      case 'ar_payment': {
        const arId = body.arId || body.referenceId
        if (arId) {
          const ar = await tx.accountsReceivable.findUnique({ where: { id: arId } })
          if (ar) {
            const payment = await tx.arPayment.create({
              data: {
                accountsReceivableId: arId,
                amount: parsedAmount,
                paymentDate: parsedDate,
                financialMovementId: movement.id,
                createdBy: userId,
              },
            })

            const newPaidAmount = ar.paidAmount + parsedAmount
            const newBalance = ar.originalAmount - newPaidAmount

            await tx.accountsReceivable.update({
              where: { id: arId },
              data: {
                paidAmount: newPaidAmount,
                balance: Math.max(0, newBalance),
                status: newBalance <= 0 ? 'paid' : ar.status,
              },
            })

            refType = 'ar_payment'
            refId = payment.id
          }
        }
        break
      }

      case 'ap_payment': {
        const apId = body.apId || body.referenceId
        if (apId) {
          const ap = await tx.accountsPayable.findUnique({ where: { id: apId } })
          if (ap) {
            const payment = await tx.apPayment.create({
              data: {
                accountsPayableId: apId,
                amount: parsedAmount,
                paymentDate: parsedDate,
                financialMovementId: movement.id,
                createdBy: userId,
              },
            })

            const newPaidAmount = ap.paidAmount + parsedAmount
            const newBalance = ap.originalAmount - newPaidAmount

            await tx.accountsPayable.update({
              where: { id: apId },
              data: {
                paidAmount: newPaidAmount,
                balance: Math.max(0, newBalance),
                status: newBalance <= 0 ? 'paid' : ap.status,
              },
            })

            refType = 'ap_payment'
            refId = payment.id
          }
        }
        break
      }

      case 'obligation_payment': {
        const obligationId = body.obligationId || body.referenceId
        if (obligationId) {
          const payment = await tx.obligationPayment.create({
            data: {
              obligationId,
              dueDate: parsedDate,
              amountDue: parsedAmount,
              amountPaid: parsedAmount,
              paymentDate: parsedDate,
              status: 'paid',
              financialMovementId: movement.id,
              notes: notes || null,
            },
          })

          const obligation = await tx.obligation.findUnique({ where: { id: obligationId } })
          if (obligation) {
            const newPaidAmount = obligation.paidAmount + parsedAmount
            const newBalance = obligation.originalAmount - newPaidAmount

            await tx.obligation.update({
              where: { id: obligationId },
              data: {
                paidAmount: newPaidAmount,
                balance: Math.max(0, newBalance),
                status: newBalance <= 0 ? 'paid' : obligation.status,
              },
            })
          }

          refType = 'obligation_payment'
          refId = payment.id
        }
        break
      }

      case 'obligation_received': {
        const obligation = await tx.obligation.create({
          data: {
            companyId,
            type: 'partner_loan',
            name: description || 'Prestamo recibido',
            originalAmount: parsedAmount,
            balance: parsedAmount,
            contactId: resolvedContactId,
            startDate: parsedDate,
            status: 'active',
            createdBy: userId,
          },
        })

        const dueDate = new Date(parsedDate)
        dueDate.setMonth(dueDate.getMonth() + 1)

        await tx.accountsPayable.create({
          data: {
            companyId,
            contactId: resolvedContactId,
            description: description || 'Prestamo recibido',
            originalAmount: parsedAmount,
            balance: parsedAmount,
            issueDate: parsedDate,
            dueDate,
          },
        })

        refType = 'obligation'
        refId = obligation.id
        break
      }

      case 'capital_contribution':
      case 'adjustment':
        break
    }

    if (refType || refId) {
      await tx.financialMovement.update({
        where: { id: movement.id },
        data: {
          referenceType: refType || null,
          referenceId: refId || null,
        },
      })
    }

    await tx.auditLog.create({
      data: {
        companyId,
        userId,
        action: 'create',
        entityType: 'financial_movement',
        entityId: movement.id,
        newValues: JSON.stringify({
          transactionId: movement.transactionId,
          movementType,
          amount: parsedAmount,
          direction,
          referenceType: refType,
          referenceId: refId,
        }),
      },
    })

    return { ...movement, referenceType: refType, referenceId: refId }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating movement:', error)
    return NextResponse.json(
      { error: 'Error al crear el movimiento' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, amount, movementType, direction, description, status, notes, movementDate, sourceType, sourceId } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const existing = await prisma.financialMovement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 })
    }

    if (existing.movementType === 'transfer') {
      return NextResponse.json(
        { error: 'Edita la transferencia completa con PATCH /api/transfers para mantener consistencia' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (amount !== undefined) data.amount = parseFloat(amount)
    if (movementType) data.movementType = movementType
    if (direction) data.direction = direction
    if (description !== undefined) data.description = description || null
    if (status) data.status = status
    if (notes !== undefined) data.notes = notes || null
    if (sourceType) data.sourceType = sourceType
    if (sourceId !== undefined) data.sourceId = sourceId || null
    if (movementDate) {
      const d = new Date(movementDate)
      data.movementDate = d
      data.occurredAt = d
    }

    const updated = await prisma.financialMovement.update({
      where: { id },
      data,
    })

    await prisma.auditLog.create({
      data: {
        companyId: existing.companyId,
        userId: body.updatedBy || 'default-user',
        action: 'update',
        entityType: 'financial_movement',
        entityId: id,
        oldValues: JSON.stringify({
          amount: existing.amount,
          movementType: existing.movementType,
          direction: existing.direction,
          description: existing.description,
          status: existing.status,
          sourceType: existing.sourceType,
          sourceId: existing.sourceId,
        }),
        newValues: JSON.stringify(data),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating movement:', error)
    return NextResponse.json({ error: 'Error al actualizar el movimiento' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const existing = await prisma.financialMovement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 })
    }

    if (existing.movementType === 'transfer') {
      const transfer = existing.referenceId
        ? await prisma.transfer.findUnique({ where: { id: existing.referenceId } })
        : null

      if (transfer) {
        await prisma.$transaction(async (tx) => {
          if (transfer.financialMovementOriginId) {
            await tx.financialMovement.delete({ where: { id: transfer.financialMovementOriginId } })
          }
          if (transfer.financialMovementDestId) {
            await tx.financialMovement.delete({ where: { id: transfer.financialMovementDestId } })
          }
          await tx.transfer.delete({ where: { id: transfer.id } })
          await tx.auditLog.create({
            data: {
              companyId: existing.companyId,
              userId: 'default-user',
              action: 'delete',
              entityType: 'transfer',
              entityId: transfer.id,
              oldValues: JSON.stringify({
                amount: transfer.amount,
                fromType: transfer.fromType,
                toType: transfer.toType,
                transferDate: transfer.transferDate.toISOString(),
              }),
            },
          })
        })
        return NextResponse.json({ ok: true, deletedTransfer: transfer.id })
      }
    }

    if (existing.referenceType && existing.referenceId) {
      const modelMap: Record<string, string> = {
        sale: 'Sale', expense: 'Expense', purchase: 'Purchase',
        income: 'Expense',
      }
      const model = modelMap[existing.referenceType]
      if (model) {
        try {
          const prismaModel = (prisma as any)[
            model === 'Sale' ? 'sale' : model === 'Expense' ? 'expense' : model === 'Purchase' ? 'purchase' : ''
          ]
          if (prismaModel) await prismaModel.delete({ where: { id: existing.referenceId } })
        } catch {}
      }
    }

    await prisma.financialMovement.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        companyId: existing.companyId,
        userId: 'default-user',
        action: 'delete',
        entityType: 'financial_movement',
        entityId: id,
        oldValues: JSON.stringify({
          amount: existing.amount,
          movementType: existing.movementType,
          description: existing.description,
        }),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting movement:', error)
    return NextResponse.json({ error: 'Error al eliminar el movimiento' }, { status: 500 })
  }
}
