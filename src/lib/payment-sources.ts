import { prisma } from '@/lib/prisma'
import { getDefaultRegisterId } from '@/lib/registers'

export interface ResolvedSource {
  sourceType: string
  sourceId: string
}

const ROUTING: Record<string, { sourceType: string; bankName?: string }> = {
  cash: { sourceType: 'cash_register' },
  nequi: { sourceType: 'bank_account', bankName: 'Nequi' },
  daviplata: { sourceType: 'bank_account', bankName: 'Daviplata' },
  tc: { sourceType: 'bank_account', bankName: 'Bancolombia' },
  td: { sourceType: 'bank_account', bankName: 'Bancolombia' },
  datafono: { sourceType: 'bank_account', bankName: 'Bancolombia' },
  transfer: { sourceType: 'bank_account', bankName: 'Bancolombia' },
  pse: { sourceType: 'bank_account', bankName: 'Bancolombia' },
  cheque: { sourceType: 'bank_account', bankName: 'Bancolombia' },
  qr: { sourceType: 'bank_account', bankName: 'Bancolombia' },
  credit: { sourceType: 'cash_register' },
  partial: { sourceType: 'cash_register' },
}

export async function resolvePaymentSource(
  paymentType: string | null | undefined,
  companyId: string,
  overrideSourceType?: string,
  overrideSourceId?: string
): Promise<ResolvedSource> {
  if (overrideSourceType && overrideSourceId) {
    return { sourceType: overrideSourceType, sourceId: overrideSourceId }
  }

  const route = paymentType ? ROUTING[paymentType] : null
  if (!route) {
    return { sourceType: 'cash_register', sourceId: await getDefaultRegisterId() }
  }

  if (route.sourceType === 'cash_register') {
    return { sourceType: 'cash_register', sourceId: await getDefaultRegisterId() }
  }

  const account = await prisma.bankAccount.findFirst({
    where: { bankName: route.bankName, companyId, isActive: true },
    select: { id: true },
  })
  if (account) {
    return { sourceType: 'bank_account', sourceId: account.id }
  }

  const fallback = await prisma.bankAccount.findFirst({
    where: { companyId, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (fallback) {
    return { sourceType: 'bank_account', sourceId: fallback.id }
  }

  throw new Error(
    'No existe una cuenta bancaria configurada. Crea una cuenta en Bancos antes de registrar pagos digitales.'
  )
}

export function isFullyPaidPaymentType(paymentType: string | null | undefined): boolean {
  if (!paymentType) return false
  const UNPAID = new Set(['credit', 'partial'])
  return !UNPAID.has(paymentType)
}

export async function resolveSourceFromPaymentMethod(
  paymentMethodId: string | null | undefined,
  companyId: string
): Promise<ResolvedSource> {
  if (paymentMethodId) {
    const pm = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
      select: { type: true, bankAccountId: true },
    })
    if (pm?.bankAccountId) {
      return { sourceType: 'bank_account', sourceId: pm.bankAccountId }
    }
  }
  return { sourceType: 'cash_register', sourceId: await getDefaultRegisterId() }
}
