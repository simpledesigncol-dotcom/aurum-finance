import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const accounts = await prisma.accountsPayable.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: true,
        purchase: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching accounts payable:', error)
    return NextResponse.json(
      { error: 'Error al obtener las cuentas por pagar' },
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
      purchaseId,
      notes,
    } = body

    if (!contactId || !description || !originalAmount || !issueDate || !dueDate) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: contactId, description, originalAmount, issueDate, dueDate' },
        { status: 400 }
      )
    }

    const ap = await prisma.accountsPayable.create({
      data: {
        companyId: 'default',
        contactId,
        purchaseId: purchaseId || null,
        description,
        originalAmount,
        balance: originalAmount,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        notes: notes || null,
      },
      include: {
        contact: true,
        purchase: true,
        payments: true,
      },
    })

    return NextResponse.json(ap, { status: 201 })
  } catch (error) {
    console.error('Error creating accounts payable:', error)
    return NextResponse.json(
      { error: 'Error al crear la cuenta por pagar' },
      { status: 500 }
    )
  }
}
