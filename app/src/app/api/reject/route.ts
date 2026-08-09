import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const token = req.headers.get('x-admin-token')
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    await supabase
      .from('conversions')
      .update({ status: 'rejected' })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[reject]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
