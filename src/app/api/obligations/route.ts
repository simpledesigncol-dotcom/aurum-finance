import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const obligations = await prisma.obligation.findMany({
      orderBy: [
        { priority: 'asc' },
        { endDate: 'asc' },
      ],
      include: {
        contact: true,
        paymentMethod: true,
        payments: {
          orderBy: { dueDate: 'desc' },
        },
      },
    })

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const summary = {
      totalBalance: obligations.reduce((sum, o) => sum + o.balance, 0),
      activeCount: obligations.filter((o) => o.status === 'active').length,
      overdueCount: 0,
      upcomingCount: 0,
      dueTodayCount: 0,
      paidCount: 0,
    }

    for (const o of obligations) {
      if (o.status === 'paid' || o.status === 'completed') {
        summary.paidCount++
        continue
      }
      if (o.status === 'cancelled') continue

      const dueDate = o.nextDueDate || o.endDate
      if (dueDate) {
        const due = new Date(dueDate)
        due.setHours(0, 0, 0, 0)
        const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays < 0 && o.balance > 0) {
          summary.overdueCount++
        } else if (diffDays === 0) {
          summary.dueTodayCount++
        } else if (diffDays <= 7) {
          summary.upcomingCount++
        }
      }
    }

    return NextResponse.json({ obligations, summary })
  } catch (error) {
    console.error('Error fetching obligations:', error)
    return NextResponse.json(
      { error: 'Error al obtener las obligaciones' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      type,
      originalAmount,
      startDate,
      contactId,
      interestRate,
      endDate,
      paymentFrequency,
      paymentAmount,
      paymentMethodId,
      priority,
      isRecurring,
      nextDueDate,
      notes,
    } = body

    if (!name || !type || !originalAmount || !startDate) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: name, type, originalAmount, startDate' },
        { status: 400 }
      )
    }

    const obligation = await prisma.obligation.create({
      data: {
        companyId: 'default',
        createdBy: 'default-user',
        name,
        type,
        originalAmount,
        balance: originalAmount,
        contactId: contactId || null,
        interestRate: interestRate || 0,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        paymentFrequency: paymentFrequency || null,
        paymentAmount: paymentAmount || null,
        paymentMethodId: paymentMethodId || null,
        priority: priority || 'normal',
        isRecurring: isRecurring || false,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        notes: notes || null,
      },
      include: {
        contact: true,
        paymentMethod: true,
        payments: true,
      },
    })

    return NextResponse.json(obligation, { status: 201 })
  } catch (error) {
    console.error('Error creating obligation:', error)
    return NextResponse.json(
      { error: 'Error al crear la obligación' },
      { status: 500 }
    )
  }
}
