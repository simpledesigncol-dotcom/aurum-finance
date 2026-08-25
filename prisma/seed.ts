import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  const company = await prisma.company.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Aurum Motors',
      currency: 'COP',
      timezone: 'America/Bogota',
    },
  })

  await prisma.user.upsert({
    where: { id: 'default-user' },
    update: {},
    create: {
      id: 'default-user',
      companyId: company.id,
      email: 'admin@aurum.com',
      name: 'Administrador',
      role: 'admin',
    },
  })

  await prisma.user.upsert({
    where: { id: 'user-gerente' },
    update: {},
    create: {
      id: 'user-gerente',
      companyId: company.id,
      email: 'gerente@aurum.com',
      name: 'Gerente',
      role: 'gerente',
    },
  })

  const expenseCategories = [
    { name: 'Pintura', type: 'expense', icon: '🎨', color: '#7C3AED', sortOrder: 1 },
    { name: 'Latonería', type: 'expense', icon: '🔧', color: '#2563EB', sortOrder: 2 },
    { name: 'Detailing', type: 'expense', icon: '✨', color: '#059669', sortOrder: 3 },
    { name: 'Repuestos', type: 'expense', icon: '⚙️', color: '#D97706', sortOrder: 4 },
    { name: 'Materiales', type: 'expense', icon: '📦', color: '#DC2626', sortOrder: 5 },
    { name: 'Mano de obra', type: 'expense', icon: '👷', color: '#4F46E5', sortOrder: 6 },
    { name: 'Transporte', type: 'expense', icon: '🚗', color: '#0891B2', sortOrder: 7 },
    { name: 'Arriendo', type: 'expense', icon: '🏠', color: '#64748B', sortOrder: 8 },
    { name: 'Servicios públicos', type: 'expense', icon: '💡', color: '#F59E0B', sortOrder: 9 },
    { name: 'Nómina', type: 'expense', icon: '👥', color: '#7C3AED', sortOrder: 10 },
    { name: 'Marketing', type: 'expense', icon: '📢', color: '#EC4899', sortOrder: 11 },
    { name: 'Mantenimiento', type: 'expense', icon: '🔩', color: '#6366F1', sortOrder: 12 },
    { name: 'Impuestos', type: 'expense', icon: '📄', color: '#BE123C', sortOrder: 13 },
    { name: 'Software', type: 'expense', icon: '💻', color: '#0EA5E9', sortOrder: 14 },
    { name: 'Papelería', type: 'expense', icon: '📝', color: '#78716C', sortOrder: 15 },
    { name: 'Caja menor', type: 'expense', icon: '💰', color: '#CA8A04', sortOrder: 16 },
    { name: 'Comisiones bancarias', type: 'expense', icon: '🏦', color: '#475569', sortOrder: 17 },
    { name: 'Otros gastos', type: 'expense', icon: '📋', color: '#9CA3AF', sortOrder: 18 },
  ]

  const incomeCategories = [
    { name: 'Pintura', type: 'income', icon: '🎨', color: '#7C3AED', sortOrder: 1 },
    { name: 'Latonería', type: 'income', icon: '🔧', color: '#2563EB', sortOrder: 2 },
    { name: 'Detailing', type: 'income', icon: '✨', color: '#059669', sortOrder: 3 },
    { name: 'Repuestos', type: 'income', icon: '⚙️', color: '#D97706', sortOrder: 4 },
    { name: 'Venta de producto', type: 'income', icon: '📦', color: '#DC2626', sortOrder: 5 },
    { name: 'Comisión', type: 'income', icon: '💸', color: '#0891B2', sortOrder: 6 },
    { name: 'Otros ingresos', type: 'income', icon: '💰', color: '#9CA3AF', sortOrder: 7 },
  ]

  for (const cat of expenseCategories) {
    await prisma.category.upsert({
      where: { id: `expense-${cat.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: { companyId: company.id, ...cat },
    })
  }

  for (const cat of incomeCategories) {
    await prisma.category.upsert({
      where: { id: `income-${cat.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: { companyId: company.id, ...cat },
    })
  }

  const paymentMethods = [
    { name: 'Efectivo', type: 'cash' },
    { name: 'Transferencia', type: 'bank_transfer' },
    { name: 'Tarjeta débito', type: 'card' },
    { name: 'Tarjeta crédito', type: 'card' },
    { name: 'Datáfono', type: 'card' },
    { name: 'Nequi', type: 'digital_wallet' },
    { name: 'Daviplata', type: 'digital_wallet' },
    { name: 'PSE', type: 'bank_transfer' },
    { name: 'Cheque', type: 'check' },
    { name: 'QR', type: 'qr' },
    { name: 'Crédito', type: 'credit' },
  ]

  for (const pm of paymentMethods) {
    const existing = await prisma.paymentMethod.findFirst({
      where: { companyId: company.id, name: pm.name },
    })
    if (!existing) {
      await prisma.paymentMethod.create({
        data: { companyId: company.id, ...pm },
      })
    }
  }

  const existingRegister = await prisma.cashRegister.findFirst({
    where: { companyId: company.id },
  })
  if (!existingRegister) {
    await prisma.cashRegister.create({
      data: {
        companyId: company.id,
        name: 'Caja General',
        type: 'general',
        openingBalance: 0,
        status: 'open',
      },
    })
    await prisma.cashRegister.create({
      data: {
        companyId: company.id,
        name: 'Caja Menor',
        type: 'petty',
        openingBalance: 300000,
        status: 'open',
      },
    })
  }

  const existingBank = await prisma.bankAccount.findFirst({
    where: { companyId: company.id },
  })
  if (!existingBank) {
    await prisma.bankAccount.create({
      data: {
        companyId: company.id,
        bankName: 'Bancolombia',
        accountType: 'ahorro',
        accountNumber: '1234567890',
        holderName: 'Aurum Motors SAS',
      },
    })
    await prisma.bankAccount.create({
      data: {
        companyId: company.id,
        bankName: 'Davivienda',
        accountType: 'ahorro',
        accountNumber: '0987654321',
        holderName: 'Aurum Motors SAS',
      },
    })
  }

  console.log('Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
