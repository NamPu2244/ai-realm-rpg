import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { requireAdmin, isAdminUser } from '@/lib/admin'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(req)
  if (!isAdminUser(admin)) return admin as Response

  const { id } = await params
  const supabase = getSupabaseServerClient()

  const { error } = await supabase.from('user_subscriptions').upsert(
    {
      user_id: id,
      status: 'active',
      plan: 'pro',
      granted_by: 'manual',
      granted_by_email: admin.email,
      current_period_end: null,
    },
    { onConflict: 'user_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
