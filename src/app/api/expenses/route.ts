import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'
import { getDefaultRegisterId } from '@/lib/registers'

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, expenseDate, categoryId, description, contactId, paymentMethodId, receiptNumber, notes } = body

    if (!amount || !expenseDate) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: amount, expenseDate' },
        { status: 400 }
      )
    }

    const expense = await prisma.expense.create({
      data: {
        companyId: 'default',
        createdBy: 'default-user',
        amount,
        expenseDate: new Date(expenseDate),
        categoryId: categoryId || null,
        description: description || null,
        contactId: contactId || null,
        paymentMethodId: paymentMethodId || null,
        receiptNumber: receiptNumber || null,
        isRecurring: false,
      },
      include: {
        category: true,
        contact: true,
        paymentMethod: true,
      },
    })

    const transactionId = await generateTransactionId()
    const registerId = await getDefaultRegisterId()

    const movement = await prisma.financialMovement.create({
      data: {
        transactionId,
        companyId: 'default',
        status: 'confirmed',
        movementType: 'expense',
        amount,
        direction: 'out',
        movementDate: new Date(expenseDate),
        description: description || `Gasto`,
        categoryId: categoryId || null,
        sourceType: 'cash_register',
        sourceId: registerId,
        contactId: contactId || null,
        referenceType: 'expense',
        referenceId: expense.id,
        createdBy: 'default-user',
      },
    })

    await prisma.expense.update({
      where: { id: expense.id },
      data: { financialMovementId: movement.id },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Error al crear el gasto' },
      { status: 500 }
    )
  }
}
