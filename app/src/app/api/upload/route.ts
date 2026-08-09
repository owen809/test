import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { createServerClient } from '@/lib/supabase'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const email = form.get('email') as string | null
    const imageFile = form.get('image') as File | null

    if (!email || !imageFile) {
      return NextResponse.json({ error: 'Missing email or image' }, { status: 400 })
    }

    const supabase = createServerClient()

    // 1. Save the uploaded image to Supabase Storage
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    const ext = imageFile.name.split('.').pop() ?? 'jpg'
    const imageKey = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(imageKey, imageBuffer, { contentType: imageFile.type })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(imageKey)
    const inputImageUrl = urlData.publicUrl

    // 2. Create a DB record with status "pending"
    const { data: record, error: insertError } = await supabase
      .from('conversions')
      .insert({ customer_email: email, input_image_url: inputImageUrl, status: 'pending' })
      .select()
      .single()

    if (insertError) throw insertError

    // 3. Run the Python converter in the background (non-blocking)
    runConversion(record.id, imageBuffer, ext, supabase).catch(console.error)

    return NextResponse.json({ id: record.id })
  } catch (err: unknown) {
    console.error('[upload]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}

// Runs TripoSR in the background after responding to the user
async function runConversion(
  recordId: string,
  imageBuffer: Buffer,
  ext: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
) {
  const tmp = tmpdir()
  const inputPath = path.join(tmp, `in-${recordId}.${ext}`)
  const outputPath = path.join(tmp, `out-${recordId}.glb`)

  try {
    await writeFile(inputPath, imageBuffer)

    // Call convert.py — adjust the path if needed
    const scriptPath = path.resolve(process.cwd(), '..', 'convert.py')
    await execAsync(`python "${scriptPath}" "${inputPath}" "${outputPath}"`)

    const glbBuffer = await readFile(outputPath)
    const outputKey = `${recordId}.glb`

    const { error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(outputKey, glbBuffer, { contentType: 'model/gltf-binary' })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('outputs')
      .getPublicUrl(outputKey)

    await supabase
      .from('conversions')
      .update({ output_file_url: urlData.publicUrl, status: 'ready_for_review' })
      .eq('id', recordId)
  } finally {
    await unlink(inputPath).catch(() => {})
    await unlink(outputPath).catch(() => {})
  }
}
