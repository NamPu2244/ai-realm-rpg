import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { requireAdmin, isAdminUser } from '@/lib/admin'

export const maxDuration = 30

export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!isAdminUser(admin)) return admin as Response

  const supabase = getSupabaseServerClient()

  const [usersResult, proResult, feedbackCountResult, recentFeedbackResult] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('feedback').select('id', { count: 'exact', head: true }),
    supabase.from('feedback')
      .select('id, message, created_at, save_slot_id')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return NextResponse.json({
    totalUsers: usersResult.data?.users?.length ?? 0,
    proUsers: proResult.count ?? 0,
    feedbackCount: feedbackCountResult.count ?? 0,
    recentFeedback: recentFeedbackResult.data ?? [],
  })
}
