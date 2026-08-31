import { prisma } from '@/lib/prisma'

export async function generateTransactionId(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `TX-${year}-`

  const found = await prisma.financialMovement.findMany({
    where: { transactionId: { startsWith: prefix } },
    orderBy: { transactionId: 'desc' },
    select: { transactionId: true },
    take: 1000,
  })

  let maxSeq = 0
  for (const m of found) {
    const parts = m.transactionId.split('-')
    if (parts.length < 3) continue
    const raw = parts[2]
    // Solo secuencias numéricas: 7 dígitos (secuencia) + 2 dígitos (aleatorio).
    // Se ignoran ids con prefijos no numéricos (p.ej. "ADJUST") que romperían
    // el cálculo y causarían colisiones de transaction_id.
    if (!/^\d{7}\d{2}$/.test(raw)) continue
    const seq = parseInt(raw.slice(0, 7), 10)
    if (seq > maxSeq) maxSeq = seq
  }

  const seq = maxSeq + 1
  const random = Math.floor(Math.random() * 90) + 10
  return `${prefix}${String(seq).padStart(7, '0')}${random}`
}
