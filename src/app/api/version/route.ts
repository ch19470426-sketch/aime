export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({ 
    commit: '2ed38c6',
    cab_css: '.cab { font-size: 10pt; font-weight: bold }',
    ts: new Date().toISOString()
  })
}
