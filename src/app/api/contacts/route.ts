import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const where = type ? { type } : {}

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        financialMovements: {
          orderBy: { movementDate: 'desc' },
          take: 5,
        },
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        purchases: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        expenses: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        agreements: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Error al obtener los contactos' },
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
      documentType,
      documentNumber,
      email,
      phone,
      address,
      contactPerson,
      notes,
    } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: nombre, tipo' },
        { status: 400 }
      )
    }

    const contact = await prisma.contact.create({
      data: {
        companyId: body.companyId || 'default',
        name,
        type,
        documentType: documentType || null,
        documentNumber: documentNumber || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        contactPerson: contactPerson || null,
        notes: notes || null,
      },
      include: {
        financialMovements: true,
        sales: true,
        purchases: true,
        expenses: true,
        agreements: true,
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Error al crear el contacto' },
      { status: 500 }
    )
  }
}
