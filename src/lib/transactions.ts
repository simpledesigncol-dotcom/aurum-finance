import { prisma } from '@/lib/prisma'

export async function generateTransactionId(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `TX-${year}-`

  const last = await prisma.financialMovement.findFirst({
    where: {
      transactionId: { startsWith: prefix },
    },
    orderBy: { transactionId: 'desc' },
    select: { transactionId: true },
  })

  let seq = 1
  if (last) {
    const lastNum = parseInt(last.transactionId.split('-')[2], 10)
    if (!isNaN(lastNum)) {
      seq = lastNum + 1
    }
  }

  const random = Math.floor(Math.random() * 90) + 10
  return `${prefix}${String(seq).padStart(7, '0')}${random}`
}
