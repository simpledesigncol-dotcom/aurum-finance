import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const results: Record<string, string> = {}

  const tables = [
    'Company', 'User', 'Contact', 'Category', 'PaymentMethod',
    'CashRegister', 'BankAccount', 'FinancialMovement', 'Sale',
    'Expense', 'Purchase', 'AccountsReceivable', 'AccountsPayable',
    'Obligation', 'WorkOrder', 'CashReconciliation', 'Document',
    'Transfer', 'AuditLog', 'Notification', 'ImportLog',
  ]

  for (const table of tables) {
    try {
      await prisma.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`)
      results[table] = 'OK'
    } catch (e: any) {
      results[table] = e.message?.slice(0, 100) || 'ERROR'
    }
  }

  // Test FinancialMovement columns
  const fmColumns = ['occurred_at', 'work_order_id', 'metadata']
  for (const col of fmColumns) {
    try {
      await prisma.$queryRawUnsafe(`SELECT "${col}" FROM "FinancialMovement" LIMIT 1`)
      results[`FM.${col}`] = 'OK'
    } catch (e: any) {
      results[`FM.${col}`] = e.message?.slice(0, 100) || 'ERROR'
    }
  }

  // Test CashRegister.type
  try {
    await prisma.$queryRawUnsafe(`SELECT "type" FROM "CashRegister" LIMIT 1`)
    results['CR.type'] = 'OK'
  } catch (e: any) {
    results['CR.type'] = e.message?.slice(0, 100) || 'ERROR'
  }

  return NextResponse.json(results)
}
