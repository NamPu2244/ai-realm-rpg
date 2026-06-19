'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin', label: 'ภาพรวม' },
  { href: '/admin/users', label: 'จัดการผู้ใช้' },
  { href: '/admin/feedback', label: 'Feedback' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-neutral-950 flex text-neutral-100">
      <aside className="w-52 shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        <div className="px-4 py-5 border-b border-neutral-800">
          <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mb-0.5">AI Realm</p>
          <p className="text-neutral-200 font-semibold text-sm">Admin Panel</p>
        </div>

        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
          {NAV.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  active
                    ? 'bg-neutral-700/80 text-neutral-100'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-neutral-800">
          <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
            ← กลับหน้าเกม
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
