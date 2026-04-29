import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { TODAY } from '@/lib/utils'

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const dateStr = TODAY.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const navLinks = [
    { path: '/', label: 'Accounts' },
    { path: '/subscriptions', label: 'Subscriptions' },
    { path: '/contacts', label: 'Contacts' },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="h-14 flex items-center justify-between px-8 border-b border-[var(--brd)] bg-[var(--bg2)] sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--green), #1fa06a)' }}>
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <path d="M3 8h3l1.5-4 2.5 8 1.5-4H14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight">BI Technology</span>
          </button>
          <div className="w-px h-6 bg-[var(--brd)]" />
          <span className="text-[15px] font-semibold text-[var(--t2)]">Customer 360</span>
          <div className="w-px h-6 bg-[var(--brd)] ml-2" />
          <nav className="flex items-center gap-1 ml-1">
            {navLinks.map(link => {
              const active = link.path === '/'
                ? location.pathname === '/' || location.pathname.startsWith('/accounts')
                : location.pathname.startsWith(link.path)
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[var(--blue)]/15 text-[var(--blue)]'
                      : 'text-[var(--t3)] hover:text-[var(--t1)] hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </button>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--t4)] font-mono">{dateStr}</span>
          <div className="flex items-center gap-1.5 py-1 pl-2.5 pr-1 rounded-full bg-[var(--bg3)] border border-[var(--brd)] text-xs font-medium text-[var(--t2)] cursor-pointer">
            Omer
            <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--green), var(--cyan))' }}>
              OC
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-[1380px] mx-auto px-8 py-6 pb-16">
        {children}
      </main>
    </div>
  )
}
