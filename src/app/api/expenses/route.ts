import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'
import { resolveSourceFromPaymentMethod } from '@/lib/payment-sources'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    const where = categoryId ? { categoryId } : {}

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        contact: true,
        paymentMethod: true,
      },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: 'Error al obtener los gastos' },
      { status: 500 }
    )
  }
}

async function resolveOrCreateContact(name: string | null | undefined, companyId: string): Promise<string | null> {
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
    data: { name, type: 'other', companyId },
  })
  return contact.id
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      amount,
      expenseDate,
      categoryId,
      description,
      contactId,
      contactName,
      paymentMethodId,
      receiptNumber,
      notes,
      workOrderId,
    } = body

    if (amount === undefined || amount === null || amount === '' || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      )
    }
    const parsedAmount = parseFloat(amount)

    if (!expenseDate) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: expenseDate' },
        { status: 400 }
      )
    }

    const companyId = body.companyId || 'default'
    const createdBy = body.createdBy || 'default-user'
    const resolvedContactId = contactId || (await resolveOrCreateContact(contactName, companyId))
    const { sourceType, sourceId } = await resolveSourceFromPaymentMethod(paymentMethodId, companyId)

    const parsedDate = new Date(expenseDate)
    const transactionId = await generateTransactionId()

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          companyId,
          createdBy,
          amount: parsedAmount,
          expenseDate: parsedDate,
          categoryId: categoryId || null,
          description: description || null,
          contactId: resolvedContactId,
          paymentMethodId: paymentMethodId || null,
          receiptNumber: receiptNumber || null,
          workOrderId: workOrderId || null,
          isRecurring: false,
        },
        include: {
          category: true,
          contact: true,
          paymentMethod: true,
        },
      })

      const movement = await tx.financialMovement.create({
        data: {
          transactionId,
          companyId,
          status: 'confirmed',
          movementType: 'expense',
          amount: parsedAmount,
          direction: 'out',
          occurredAt: parsedDate,
          movementDate: parsedDate,
          description: description || 'Gasto',
          categoryId: categoryId || null,
          sourceType,
          sourceId,
          contactId: resolvedContactId,
          workOrderId: workOrderId || null,
          referenceType: 'expense',
          referenceId: expense.id,
          notes: notes || null,
          createdBy,
        },
      })

      await tx.expense.update({
        where: { id: expense.id },
        data: { financialMovementId: movement.id },
      })

      return expense
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Error al crear el gasto' },
      { status: 500 }
    )
  }
}
