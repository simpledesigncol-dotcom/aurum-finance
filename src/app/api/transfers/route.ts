import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateTransactionId } from '@/lib/transactions'

export const dynamic = 'force-dynamic'

interface TransferAccount {
  type: string
  id: string
}

async function resolveAccountLabel(account: TransferAccount): Promise<string> {
  if (account.type === 'cash_register') {
    const reg = await prisma.cashRegister.findUnique({
      where: { id: account.id },
      select: { name: true },
    })
    return reg?.name || 'Caja'
  }
  if (account.type === 'bank_account') {
    const bank = await prisma.bankAccount.findUnique({
      where: { id: account.id },
      select: { bankName: true },
    })
    return bank?.bankName || 'Banco'
  }
  return account.type
}

async function assertAccountExists(account: TransferAccount): Promise<void> {
  if (account.type === 'cash_register') {
    const exists = await prisma.cashRegister.findUnique({ where: { id: account.id }, select: { id: true } })
    if (!exists) throw new Error('La caja de origen/destino no existe')
  } else if (account.type === 'bank_account') {
    const exists = await prisma.bankAccount.findUnique({ where: { id: account.id }, select: { id: true } })
    if (!exists) throw new Error('La cuenta bancaria de origen/destino no existe')
  } else {
    throw new Error('Tipo de cuenta inválido')
  }
}

function parseBody(body: Record<string, unknown>) {
  const amount = parseFloat(String(body.amount ?? '0'))
  const fromType = String(body.fromType || '')
  const fromId = String(body.fromId || '')
  const toType = String(body.toType || '')
  const toId = String(body.toId || '')
  const transferDate = body.transferDate ? new Date(String(body.transferDate)) : new Date()
  return {
    amount,
    from: { type: fromType, id: fromId } as TransferAccount,
    to: { type: toType, id: toId } as TransferAccount,
    transferDate,
    description: body.description ? String(body.description) : null,
    status: body.status ? String(body.status) : 'confirmed',
    createdBy: body.createdBy ? String(body.createdBy) : 'default-user',
    companyId: body.companyId ? String(body.companyId) : 'default',
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        orderBy: { transferDate: 'desc' },
        skip,
        take: limit,
        include: {
          originMovement: true,
          destMovement: true,
          creator: { select: { name: true, email: true } },
        },
      }),
      prisma.transfer.count(),
    ])

    return NextResponse.json({
      transfers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error fetching transfers:', error)
    return NextResponse.json(
      { error: 'Error al obtener las transferencias' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const p = parseBody(body)

    if (!Number.isFinite(p.amount) || p.amount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor que 0' }, { status: 400 })
    }
    if (!p.from.type || !p.from.id || !p.to.type || !p.to.id) {
      return NextResponse.json(
        { error: 'Debes especificar el origen y el destino de la transferencia' },
        { status: 400 }
      )
    }
    if (p.from.type === p.to.type && p.from.id === p.to.id) {
      return NextResponse.json(
        { error: 'El origen y el destino no pueden ser la misma cuenta' },
        { status: 400 }
      )
    }

    await assertAccountExists(p.from)
    await assertAccountExists(p.to)

    const fromLabel = await resolveAccountLabel(p.from)
    const toLabel = await resolveAccountLabel(p.to)

    const originTransactionId = await generateTransactionId()
    const destTransactionId = await generateTransactionId()

    const result = await prisma.$transaction(async (tx) => {
      const originMovement = await tx.financialMovement.create({
        data: {
          transactionId: originTransactionId,
          companyId: p.companyId,
          status: p.status,
          movementType: 'transfer',
          amount: p.amount,
          direction: 'out',
          occurredAt: p.transferDate,
          movementDate: p.transferDate,
          description: p.description || `Transferencia a ${toLabel}`,
          sourceType: p.from.type,
          sourceId: p.from.id,
          workOrderId: null,
          createdBy: p.createdBy,
        },
      })

      const destMovement = await tx.financialMovement.create({
        data: {
          transactionId: destTransactionId,
          companyId: p.companyId,
          status: p.status,
          movementType: 'transfer',
          amount: p.amount,
          direction: 'in',
          occurredAt: p.transferDate,
          movementDate: p.transferDate,
          description: p.description || `Transferencia desde ${fromLabel}`,
          sourceType: p.to.type,
          sourceId: p.to.id,
          workOrderId: null,
          createdBy: p.createdBy,
        },
      })

      const transfer = await tx.transfer.create({
        data: {
          companyId: p.companyId,
          fromType: p.from.type,
          fromId: p.from.id,
          toType: p.to.type,
          toId: p.to.id,
          amount: p.amount,
          description: p.description,
          transferDate: p.transferDate,
          financialMovementOriginId: originMovement.id,
          financialMovementDestId: destMovement.id,
          createdBy: p.createdBy,
        },
      })

      await tx.financialMovement.update({
        where: { id: originMovement.id },
        data: { referenceType: 'transfer', referenceId: transfer.id },
      })
      await tx.financialMovement.update({
        where: { id: destMovement.id },
        data: { referenceType: 'transfer', referenceId: transfer.id },
      })

      await tx.auditLog.create({
        data: {
          companyId: p.companyId,
          userId: p.createdBy,
          action: 'create',
          entityType: 'transfer',
          entityId: transfer.id,
          newValues: JSON.stringify({
            amount: p.amount,
            fromLabel,
            toLabel,
            transferDate: p.transferDate.toISOString(),
            status: p.status,
          }),
        },
      })

      return tx.transfer.findUnique({
        where: { id: transfer.id },
        include: { originMovement: true, destMovement: true },
      })
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating transfer:', error)
    const message = error instanceof Error ? error.message : 'Error al crear la transferencia'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const existing = await prisma.transfer.findUnique({
      where: { id },
      include: { originMovement: true, destMovement: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Transferencia no encontrada' }, { status: 404 })
    }

    const p = parseBody(body)

    const newAmount = body.amount !== undefined ? p.amount : existing.amount
    const newDate = body.transferDate ? new Date(String(body.transferDate)) : existing.transferDate
    const newFrom = body.fromType && body.fromId ? p.from : { type: existing.fromType, id: existing.fromId }
    const newTo = body.toType && body.toId ? p.to : { type: existing.toType, id: existing.toId }
    const newDescription = body.description !== undefined ? (body.description ? String(body.description) : null) : existing.description
    const newStatus = body.status ? String(body.status) : 'confirmed'

    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor que 0' }, { status: 400 })
    }
    if (newFrom.type === newTo.type && newFrom.id === newTo.id) {
      return NextResponse.json(
        { error: 'El origen y el destino no pueden ser la misma cuenta' },
        { status: 400 }
      )
    }

    await assertAccountExists(newFrom)
    await assertAccountExists(newTo)

    const fromLabel = await resolveAccountLabel(newFrom)
    const toLabel = await resolveAccountLabel(newTo)

    const updated = await prisma.$transaction(async (tx) => {
      const fromChanged = newFrom.type !== existing.fromType || newFrom.id !== existing.fromId
      const toChanged = newTo.type !== existing.toType || newTo.id !== existing.toId

      if (existing.originMovement) {
        await tx.financialMovement.update({
          where: { id: existing.originMovement.id },
          data: {
            amount: newAmount,
            movementDate: newDate,
            occurredAt: newDate,
            status: newStatus,
            ...(fromChanged && { sourceType: newFrom.type, sourceId: newFrom.id }),
            ...(toChanged && { description: newDescription || `Transferencia a ${toLabel}` }),
            ...(!toChanged && newDescription !== null && { description: newDescription }),
          },
        })
      }

      if (existing.destMovement) {
        await tx.financialMovement.update({
          where: { id: existing.destMovement.id },
          data: {
            amount: newAmount,
            movementDate: newDate,
            occurredAt: newDate,
            status: newStatus,
            ...(toChanged && { sourceType: newTo.type, sourceId: newTo.id }),
            ...(fromChanged && { description: newDescription || `Transferencia desde ${fromLabel}` }),
            ...(!fromChanged && newDescription !== null && { description: newDescription }),
          },
        })
      }

      const transfer = await tx.transfer.update({
        where: { id },
        data: {
          fromType: newFrom.type,
          fromId: newFrom.id,
          toType: newTo.type,
          toId: newTo.id,
          amount: newAmount,
          description: newDescription,
          transferDate: newDate,
        },
        include: { originMovement: true, destMovement: true },
      })

      await tx.auditLog.create({
        data: {
          companyId: existing.companyId,
          userId: p.createdBy,
          action: 'update',
          entityType: 'transfer',
          entityId: id,
          oldValues: JSON.stringify({
            amount: existing.amount,
            fromLabel,
            toLabel,
            transferDate: existing.transferDate.toISOString(),
          }),
          newValues: JSON.stringify({
            amount: newAmount,
            fromLabel,
            toLabel,
            transferDate: newDate.toISOString(),
            status: newStatus,
          }),
        },
      })

      return transfer
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating transfer:', error)
    const message = error instanceof Error ? error.message : 'Error al actualizar la transferencia'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const existing = await prisma.transfer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Transferencia no encontrada' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      if (existing.financialMovementOriginId) {
        await tx.financialMovement.delete({ where: { id: existing.financialMovementOriginId } })
      }
      if (existing.financialMovementDestId) {
        await tx.financialMovement.delete({ where: { id: existing.financialMovementDestId } })
      }
      await tx.transfer.delete({ where: { id } })
      await tx.auditLog.create({
        data: {
          companyId: existing.companyId,
          userId: 'default-user',
          action: 'delete',
          entityType: 'transfer',
          entityId: id,
          oldValues: JSON.stringify({
            amount: existing.amount,
            transferDate: existing.transferDate.toISOString(),
          }),
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transfer:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la transferencia' },
      { status: 500 }
    )
  }
}