import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from './supabase/server'

export type AdminUser = { id: string; email: string }

export async function requireAdmin(req: Request): Promise<AdminUser | Response> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { id: user.id, email: user.email! }
}

export function isAdminUser(v: AdminUser | Response): v is AdminUser {
  return 'id' in v
}
