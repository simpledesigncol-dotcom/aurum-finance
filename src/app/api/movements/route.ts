import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'
import { getDefaultRegisterId } from '@/lib/registers'

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

async function createEntityForMovement(
  movementType: string,
  amount: number,
  direction: string,
  movementDate: Date,
  description: string | null,
  contactId: string | null,
  paymentType: string | null,
  notes: string | null,
  movementId: string,
  companyId: string,
  createdBy: string
): Promise<{ referenceType: string | null; referenceId: string | null }> {
  let refType: string | null = null
  let refId: string | null = null

  try {
    if (movementType === 'obligation_received' || (movementType === 'obligation_received' && direction === 'in')) {
      const obligation = await prisma.obligation.create({
        data: {
          companyId,
          type: 'partner_loan',
          name: description || 'Préstamo recibido',
          originalAmount: amount,
          balance: amount,
          contactId,
          startDate: movementDate,
          status: 'active',
          createdBy,
        },
      })

      const dueDate = new Date(movementDate)
      dueDate.setMonth(dueDate.getMonth() + 1)

      await prisma.accountsPayable.create({
        data: {
          companyId,
          contactId: contactId || null,
          description: description || 'Préstamo recibido',
          originalAmount: amount,
          balance: amount,
          issueDate: movementDate,
          dueDate,
        },
      })

      refType = 'obligation'
      refId = obligation.id
    }

    if (movementType === 'sale' || (movementType === 'income' && direction === 'in')) {
      const sale = await prisma.sale.create({
        data: {
          companyId,
          contactId,
          saleDate: movementDate,
          status: 'completed',
          paymentType: paymentType || 'cash',
          subtotal: amount,
          total: amount,
          amountPaid: amount,
          source: 'manual',
          createdBy,
        },
      })

      await prisma.salePayment.create({
        data: {
          saleId: sale.id,
          amount,
          paymentDate: movementDate,
          financialMovementId: movementId,
          createdBy,
        },
      })

      refType = 'sale'
      refId = sale.id
    }

    if (movementType === 'expense' || (movementType === 'expense' && direction === 'out')) {
      const expense = await prisma.expense.create({
        data: {
          companyId,
          amount,
          description,
          expenseDate: movementDate,
          financialMovementId: movementId,
          createdBy,
        },
      })

      refType = 'expense'
      refId = expense.id
    }

    if (movementType === 'purchase' || (movementType === 'purchase' && direction === 'out')) {
      const purchase = await prisma.purchase.create({
        data: {
          companyId,
          contactId,
          purchaseDate: movementDate,
          purchaseType: 'other',
          subtotal: amount,
          total: amount,
          paymentType: paymentType || 'cash',
          amountPaid: amount,
          status: 'completed',
          createdBy,
        },
      })

      await prisma.purchasePayment.create({
        data: {
          purchaseId: purchase.id,
          amount,
          paymentDate: movementDate,
          financialMovementId: movementId,
          createdBy,
        },
      })

      refType = 'purchase'
      refId = purchase.id
    }

    if (movementType === 'obligation_payment' || (movementType === 'obligation_payment' && direction === 'out')) {
      refType = 'obligation_payment'
    }

    if (movementType === 'ar_payment' || (movementType === 'ar_payment' && direction === 'in')) {
      const sale = await prisma.sale.create({
        data: {
          companyId,
          contactId,
          saleDate: movementDate,
          status: 'completed',
          paymentType: paymentType || 'cash',
          subtotal: amount,
          total: amount,
          amountPaid: amount,
          source: 'manual',
          createdBy,
        },
      })

      await prisma.salePayment.create({
        data: {
          saleId: sale.id,
          amount,
          paymentDate: movementDate,
          financialMovementId: movementId,
          createdBy,
        },
      })

      refType = 'sale'
      refId = sale.id
    }
  } catch (err) {
    console.error(`Error creating entity for movementType=${movementType}:`, err)
  }

  return { referenceType: refType, referenceId: refId }
}

async function resolvePaymentSource(
  paymentType: string | null,
  companyId: string
): Promise<{ sourceType: string; sourceId: string }> {
  const routing: Record<string, { sourceType: string; bankName?: string }> = {
    cash: { sourceType: 'cash_register' },
    nequi: { sourceType: 'bank_account', bankName: 'Nequi' },
    daviplata: { sourceType: 'bank_account', bankName: 'Daviplata' },
    tc: { sourceType: 'bank_account', bankName: 'Bancolombia' },
    td: { sourceType: 'bank_account', bankName: 'Bancolombia' },
    transfer: { sourceType: 'bank_account', bankName: 'Bancolombia' },
    credit: { sourceType: 'cash_register' },
    partial: { sourceType: 'cash_register' },
  }

  const route = paymentType ? routing[paymentType] : null
  if (!route) return { sourceType: 'cash_register', sourceId: await getDefaultRegisterId() }

  if (route.sourceType === 'cash_register') {
    return { sourceType: 'cash_register', sourceId: await getDefaultRegisterId() }
  }

  const account = await prisma.bankAccount.findFirst({
    where: { bankName: route.bankName, companyId },
    select: { id: true },
  })
  if (account) return { sourceType: 'bank_account', sourceId: account.id }

  const newAccount = await prisma.bankAccount.create({
    data: { companyId, bankName: route.bankName!, accountType: 'savings' },
  })
  return { sourceType: 'bank_account', sourceId: newAccount.id }
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
      contactName,
      paymentType,
      notes,
      createdBy,
      status,
    } = body

    if (!movementType || !amount || !direction || !createdBy) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes' },
        { status: 400 }
      )
    }

    const companyId = body.companyId || 'default'
    const parsedAmount = parseFloat(amount)
    const parsedDate = movementDate ? new Date(movementDate) : new Date()

    const resolvedContactId =
      contactId || (await resolveOrCreateContact(contactName, movementTypeToContactType(movementType), companyId))

    const { sourceType: resolvedSourceType, sourceId: resolvedSourceId } = await resolvePaymentSource(
      paymentType || null,
      companyId
    )

    const transactionId = await generateTransactionId()

    const movement = await prisma.financialMovement.create({
      data: {
        transactionId,
        companyId,
        status: status || 'confirmed',
        movementType,
        amount: parsedAmount,
        direction,
        movementDate: parsedDate,
        categoryId: categoryId || null,
        description,
        sourceType: resolvedSourceType,
        sourceId: resolvedSourceId,
        contactId: resolvedContactId,
        notes: notes || null,
        createdBy,
      },
    })

    const { referenceType, referenceId } = await createEntityForMovement(
      movementType,
      parsedAmount,
      direction,
      parsedDate,
      description || null,
      resolvedContactId,
      paymentType || null,
      notes || null,
      movement.id,
      companyId,
      createdBy
    )

    if (referenceType || referenceId) {
      await prisma.financialMovement.update({
        where: { id: movement.id },
        data: {
          referenceType: referenceType || null,
          referenceId: referenceId || null,
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: createdBy,
        action: 'create',
        entityType: 'financial_movement',
        entityId: movement.id,
        newValues: JSON.stringify({ ...movement, referenceType, referenceId }),
      },
    })

    return NextResponse.json({ ...movement, referenceType, referenceId }, { status: 201 })
  } catch (error) {
    console.error('Error creating movement:', error)
    return NextResponse.json(
      { error: 'Error al crear el movimiento' },
      { status: 500 }
    )
  }
}

function movementTypeToContactType(movementType: string): string {
  switch (movementType) {
    case 'sale':
      return 'client'
    case 'purchase':
      return 'supplier'
    case 'obligation_received':
      return 'supplier'
    case 'obligation_payment':
      return 'supplier'
    case 'ar_payment':
      return 'client'
    case 'ap_payment':
      return 'supplier'
    default:
      return 'other'
  }
}
