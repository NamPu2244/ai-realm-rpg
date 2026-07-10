'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

type Subscription = {
  status: string
  plan: string
  granted_by: string
  granted_by_email: string | null
  current_period_end: string | null
}

type AdminUser = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  subscription: Subscription | null
  save_slot_count: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const { data } = await getSupabaseClient().auth.getSession()
      setToken(data.session?.access_token ?? null)
    })()
  }, [])

  const fetchUsers = useCallback(async (t: string) => {
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${t}` } })
    const data = await res.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    // Legitimate data-fetch effect: fetchUsers is async, so its setState runs after
    // the await (not a synchronous in-effect cascade). The lint rule can't see across
    // the async boundary, so disable it here rather than contort a real fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) fetchUsers(token)
  }, [token, fetchUsers])

  const handleGrant = async (userId: string) => {
    if (!token) return
    setActing(userId)
    await fetch(`/api/admin/users/${userId}/grant`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchUsers(token)
    setActing(null)
  }

  const handleRevoke = async (userId: string) => {
    if (!token || !confirm('Confirm revoke Pro access for this user?')) return
    setActing(userId)
    await fetch(`/api/admin/users/${userId}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchUsers(token)
    setActing(null)
  }

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="p-8 text-neutral-500 text-sm">Loading...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-neutral-100">
          All Users{' '}
          <span className="text-neutral-500 font-normal text-sm">({users.length})</span>
        </h1>
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm rounded px-3 py-1.5 w-60 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-500 text-xs uppercase tracking-wider">
              <th className="text-left py-2 pr-4 font-medium">Email</th>
              <th className="text-left py-2 pr-4 font-medium">Joined</th>
              <th className="text-left py-2 pr-4 font-medium">Last sign-in</th>
              <th className="text-center py-2 pr-4 font-medium">Slots</th>
              <th className="text-left py-2 pr-4 font-medium">Status</th>
              <th className="text-left py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/40">
            {filtered.map((user) => (
              <tr key={user.id} className="text-neutral-300 hover:bg-neutral-900/40 transition-colors">
                <td className="py-3 pr-4 font-mono text-xs text-neutral-400">{user.email}</td>
                <td className="py-3 pr-4 text-xs text-neutral-500">
                  {new Date(user.created_at).toLocaleDateString('en-US')}
                </td>
                <td className="py-3 pr-4 text-xs text-neutral-500">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString('en-US')
                    : '—'}
                </td>
                <td className="py-3 pr-4 text-center text-xs">{user.save_slot_count}</td>
                <td className="py-3 pr-4">
                  {user.subscription?.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                      Pro{user.subscription.granted_by === 'manual' ? ' (manual)' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-600">Free</span>
                  )}
                </td>
                <td className="py-3">
                  {acting === user.id && (
                    <span className="text-xs text-neutral-500">Processing...</span>
                  )}
                  {acting !== user.id && user.subscription?.status === 'active' && (
                    <button
                      onClick={() => handleRevoke(user.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                  {acting !== user.id && user.subscription?.status !== 'active' && (
                    <button
                      onClick={() => handleGrant(user.id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Grant Pro
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="text-neutral-600 text-sm text-center py-10">No users found</p>
        )}
      </div>
    </div>
  )
}
