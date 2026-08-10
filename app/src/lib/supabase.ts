import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// Server-side client (uses service role key — never expose in browser)
export function createServerClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

// Browser-safe client (uses anon key)
export function createBrowserClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, key)
}
