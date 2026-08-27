import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.DATABASE_URL || 'NOT_SET'
  const masked = url.length > 20
    ? url.slice(0, 15) + '...' + url.slice(-10)
    : url

  return NextResponse.json({
    hasUrl: !!process.env.DATABASE_URL,
    urlMasked: masked,
    urlLength: url.length,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
    nodeEnv: process.env.NODE_ENV,
  })
}
