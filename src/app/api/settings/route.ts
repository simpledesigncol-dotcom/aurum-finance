import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const company = await prisma.company.findFirst({
      where: { id: 'default' },
    })

    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    const paymentMethods = await prisma.paymentMethod.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ company, categories, paymentMethods })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Error al obtener la configuración' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()

    const company = await prisma.company.upsert({
      where: { id: 'default' },
      update: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.nit !== undefined && { nit: body.nit }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
      },
      create: {
        id: 'default',
        name: body.name || 'Empresa',
        nit: body.nit || null,
        address: body.address || null,
        phone: body.phone || null,
        email: body.email || null,
      },
    })

    return NextResponse.json(company)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la configuración' },
      { status: 500 }
    )
  }
}
