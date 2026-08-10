'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const ModelViewer = dynamic(() => import('@/components/ModelViewer'), { ssr: false })

interface Conversion {
  id: string
  customer_email: string
  input_image_url: string
  output_file_url: string | null
  status: string
  created_at: string
}

export default function AdminPage() {
  const [token, setToken] = useState('')
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    // The ADMIN_TOKEN is what you set in .env.local
    setToken(password)
    setAuthed(true)
  }

  async function fetchConversions(tok: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/conversions', {
        headers: { 'x-admin-token': tok },
      })
      const data = await res.json()
      setConversions(data.conversions ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authed) fetchConversions(token)
  }, [authed, token])

  async function handleAction(id: string, action: 'approve' | 'reject') {
    const res = await fetch(`/api/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setMessage(`${action === 'approve' ? 'Approved' : 'Rejected'} successfully`)
      fetchConversions(token)
    } else {
      setMessage('Action failed')
    }
  }

  if (!authed) {
    return (
      <main className="max-w-sm mx-auto py-24 px-4">
        <h1 className="text-2xl font-bold text-center mb-6">Admin Login</h1>
        <form onSubmit={login} className="bg-white shadow rounded-xl p-6 space-y-4">
          <input
            type="password"
            placeholder="Admin token"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700"
          >
            Sign in
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={() => fetchConversions(token)}
          className="text-sm text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">{message}</div>
      )}

      {loading && <p className="text-gray-500">Loading…</p>}

      {!loading && conversions.length === 0 && (
        <p className="text-gray-400">No conversions yet.</p>
      )}

      <div className="space-y-6">
        {conversions.map((conv) => (
          <div key={conv.id} className="bg-white shadow rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-gray-800">{conv.customer_email}</p>
                <p className="text-xs text-gray-400">
                  {new Date(conv.created_at).toLocaleString()}
                </p>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    conv.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : conv.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : conv.status === 'ready_for_review'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {conv.status}
                </span>
              </div>

              <div className="flex gap-2">
                {conv.output_file_url && (
                  <a
                    href={conv.output_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                  >
                    Download .glb
                  </a>
                )}
                {(conv.status === 'ready_for_review' || conv.status === 'pending') && (
                  <>
                    <button
                      onClick={() => handleAction(conv.id, 'approve')}
                      className="text-sm px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(conv.id, 'reject')}
                      className="text-sm px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Original image</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={conv.input_image_url}
                  alt="Input"
                  className="w-full h-48 object-contain rounded-lg border bg-gray-50"
                />
              </div>
              {conv.output_file_url && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">3D preview</p>
                  <ModelViewer url={conv.output_file_url} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
