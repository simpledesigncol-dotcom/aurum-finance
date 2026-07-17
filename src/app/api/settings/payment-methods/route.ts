import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(paymentMethods)
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json(
      { error: 'Error al obtener los métodos de pago' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, type, bankAccountId } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: name, type' },
        { status: 400 }
      )
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        companyId: 'default',
        name,
        type,
        bankAccountId: bankAccountId || null,
      },
    })

    return NextResponse.json(paymentMethod, { status: 201 })
  } catch (error) {
    console.error('Error creating payment method:', error)
    return NextResponse.json(
      { error: 'Error al crear el método de pago' },
      { status: 500 }
    )
  }
}
