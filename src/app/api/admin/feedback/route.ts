import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { requireAdmin, isAdminUser } from '@/lib/admin'

export const maxDuration = 15

export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!isAdminUser(admin)) return admin as Response

  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .from('feedback')
    .select('id, message, save_slot_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feedback: data ?? [], total: data?.length ?? 0 })
}
