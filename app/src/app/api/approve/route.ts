import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Simple admin token check
    const token = req.headers.get('x-admin-token')
    if (token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data: record, error: fetchError } = await supabase
      .from('conversions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    await supabase
      .from('conversions')
      .update({ status: 'approved' })
      .eq('id', id)

    // Send email to customer
    if (process.env.RESEND_API_KEY && record.output_file_url) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'no-reply@yourdomain.com',
        to: record.customer_email,
        subject: 'Your 3D model is ready!',
        html: `
          <p>Hi there!</p>
          <p>Your 3D model has been approved and is ready to download:</p>
          <p><a href="${record.output_file_url}" style="color:#2563eb;font-weight:bold">Download your 3D model (.glb)</a></p>
          <p>This file can be opened in Blender, Windows 3D Viewer, or any glTF-compatible viewer.</p>
          <p>Thanks for using our service!</p>
        `,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[approve]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
