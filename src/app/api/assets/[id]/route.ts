import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name, assetType, purchaseDate, purchasePrice,
      usefulLifeMonths, salvageValue, serialNumber, location, notes, status,
    } = body

    const existing = await prisma.asset.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 })
    }

    const price = Number(purchasePrice ?? existing.purchasePrice)
    const salvage = Number(salvageValue ?? existing.salvageValue)
    const lifeMonths = Number(usefulLifeMonths ?? existing.usefulLifeMonths)
    const depreciableAmount = price - salvage
    const monthlyDepreciation = depreciableAmount / lifeMonths

    const now = new Date()
    const purchase = new Date(purchaseDate ?? existing.purchaseDate)
    const monthsElapsed = Math.min(
      (now.getFullYear() - purchase.getFullYear()) * 12 + (now.getMonth() - purchase.getMonth()),
      lifeMonths
    )
    const accumulatedDepreciation = monthlyDepreciation * monthsElapsed
    const netBookValue = price - accumulatedDepreciation

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(assetType !== undefined && { assetType }),
        ...(purchaseDate !== undefined && { purchaseDate: new Date(purchaseDate) }),
        ...(purchasePrice !== undefined && { purchasePrice: price }),
        ...(salvageValue !== undefined && { salvageValue: salvage }),
        ...(usefulLifeMonths !== undefined && { usefulLifeMonths: lifeMonths }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
        ...(location !== undefined && { location: location || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(status !== undefined && { status }),
        accumulatedDepreciation,
        netBookValue,
      },
    })

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Error updating asset:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el activo' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.asset.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting asset:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el activo' },
      { status: 500 }
    )
  }
}
