import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.DATABASE_URL || 'NOT_SET'

  let hostname = 'N/A'
  let port = 'N/A'
  try {
    const parsed = new URL(url)
    hostname = parsed.hostname
    port = parsed.port
  } catch {}

  return NextResponse.json({
    hostname,
    port,
    urlLength: url.length,
  })
}
