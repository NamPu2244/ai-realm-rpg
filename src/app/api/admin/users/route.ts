import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { requireAdmin, isAdminUser } from '@/lib/admin'

export const maxDuration = 30

export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!isAdminUser(admin)) return admin as Response

  const supabase = getSupabaseServerClient()

  const [usersResult, subscriptionsResult, saveSlotsResult] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 200 }),
    supabase.from('user_subscriptions').select('user_id, status, plan, granted_by, granted_by_email, current_period_end, created_at'),
    supabase.from('save_slots').select('user_id'),
  ])

  const subMap = new Map((subscriptionsResult.data ?? []).map((s) => [s.user_id, s]))

  const slotMap = new Map<string, number>()
  for (const s of saveSlotsResult.data ?? []) {
    slotMap.set(s.user_id, (slotMap.get(s.user_id) ?? 0) + 1)
  }

  const users = (usersResult.data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    subscription: subMap.get(u.id) ?? null,
    save_slot_count: slotMap.get(u.id) ?? 0,
  }))

  return NextResponse.json({ users, total: users.length })
}
