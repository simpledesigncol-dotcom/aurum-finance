import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(assets)
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json(
      { error: 'Error al obtener los activos' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name, assetType, purchaseDate, purchasePrice,
      usefulLifeMonths, salvageValue, serialNumber, location, notes,
    } = body

    if (!name || !assetType || !purchaseDate || !purchasePrice || !usefulLifeMonths) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes' },
        { status: 400 }
      )
    }

    const salvage = salvageValue || 0
    const depreciableAmount = Number(purchasePrice) - salvage
    const monthlyDepreciation = depreciableAmount / Number(usefulLifeMonths)

    const now = new Date()
    const purchase = new Date(purchaseDate)
    const monthsElapsed = Math.min(
      (now.getFullYear() - purchase.getFullYear()) * 12 + (now.getMonth() - purchase.getMonth()),
      Number(usefulLifeMonths)
    )
    const accumulatedDepreciation = monthlyDepreciation * monthsElapsed
    const netBookValue = Number(purchasePrice) - accumulatedDepreciation

    const asset = await prisma.asset.create({
      data: {
        companyId: 'default',
        name,
        assetType,
        purchaseDate: new Date(purchaseDate),
        purchasePrice: Number(purchasePrice),
        salvageValue: salvage,
        usefulLifeMonths: Number(usefulLifeMonths),
        accumulatedDepreciation,
        netBookValue,
        serialNumber: serialNumber || null,
        location: location || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error('Error creating asset:', error)
    return NextResponse.json(
      { error: 'Error al crear el activo' },
      { status: 500 }
    )
  }
}
