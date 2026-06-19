'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

type Stats = {
  totalUsers: number
  proUsers: number
  feedbackCount: number
  recentFeedback: { id: string; message: string; created_at: string; save_slot_id: string | null }[]
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession()
        if (!session) { setError('ไม่พบ session'); return }
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) { setError('โหลดข้อมูลไม่สำเร็จ'); return }
        setStats(await res.json())
      } catch {
        setError('เกิดข้อผิดพลาด')
      }
    })()
  }, [])

  if (error) return <div className="p-8 text-red-400">{error}</div>
  if (!stats) return <div className="p-8 text-neutral-500 text-sm">กำลังโหลด...</div>

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-lg font-semibold text-neutral-100 mb-6">ภาพรวม</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="ผู้ใช้ทั้งหมด" value={stats.totalUsers} />
        <StatCard label="Pro (active)" value={stats.proUsers} accent />
        <StatCard label="Feedback" value={stats.feedbackCount} />
      </div>

      <section>
        <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
          Feedback ล่าสุด
        </h2>
        {stats.recentFeedback.length === 0 ? (
          <p className="text-neutral-600 text-sm">ยังไม่มี feedback</p>
        ) : (
          <div className="flex flex-col gap-2">
            {stats.recentFeedback.map((f) => (
              <div key={f.id} className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3">
                <p className="text-neutral-200 text-sm line-clamp-2">{f.message}</p>
                <p className="text-neutral-500 text-xs mt-1.5">
                  {new Date(f.created_at).toLocaleString('th-TH')}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
      <p className="text-neutral-500 text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${accent ? 'text-emerald-400' : 'text-neutral-100'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}
