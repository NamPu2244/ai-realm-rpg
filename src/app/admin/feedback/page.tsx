'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

type FeedbackEntry = {
  id: string
  message: string
  save_slot_id: string | null
  created_at: string
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await getSupabaseClient().auth.getSession()
      if (!session) return
      const res = await fetch('/api/admin/feedback', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setFeedback(data.feedback ?? [])
      setLoading(false)
    })()
  }, [])

  const filtered = feedback.filter((f) =>
    f.message.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="p-8 text-neutral-500 text-sm">Loading...</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-neutral-100">
          Feedback{' '}
          <span className="text-neutral-500 font-normal text-sm">({feedback.length})</span>
        </h1>
        <input
          type="text"
          placeholder="Search messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm rounded px-3 py-1.5 w-56 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-neutral-600 text-sm">No feedback found</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3"
            >
              <p className="text-neutral-200 text-sm whitespace-pre-wrap">{f.message}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-neutral-500 text-xs">
                  {new Date(f.created_at).toLocaleString('en-US')}
                </span>
                {f.save_slot_id && (
                  <span className="text-neutral-600 text-xs font-mono">
                    slot: {f.save_slot_id.slice(0, 8)}…
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
