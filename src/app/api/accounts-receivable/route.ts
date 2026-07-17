import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const accounts = await prisma.accountsReceivable.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: true,
        sale: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching accounts receivable:', error)
    return NextResponse.json(
      { error: 'Error al obtener las cuentas por cobrar' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      contactId,
      description,
      originalAmount,
      issueDate,
      dueDate,
      saleId,
      notes,
    } = body

    if (!contactId || !description || !originalAmount || !issueDate || !dueDate) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: contactId, description, originalAmount, issueDate, dueDate' },
        { status: 400 }
      )
    }

    const ar = await prisma.accountsReceivable.create({
      data: {
        companyId: 'default',
        contactId,
        saleId: saleId || null,
        description,
        originalAmount,
        balance: originalAmount,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        notes: notes || null,
      },
      include: {
        contact: true,
        sale: true,
        payments: true,
      },
    })

    return NextResponse.json(ar, { status: 201 })
  } catch (error) {
    console.error('Error creating accounts receivable:', error)
    return NextResponse.json(
      { error: 'Error al crear la cuenta por cobrar' },
      { status: 500 }
    )
  }
}
