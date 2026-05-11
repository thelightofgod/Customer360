import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const navLinks = [
    { path: '/', label: 'Accounts' },
    { path: '/subscriptions', label: 'Subscriptions' },
    { path: '/contacts', label: 'Contacts' },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav
        className="h-14 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-50"
        style={{
          background: 'rgba(25, 32, 58, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(91, 158, 255, 0.10)',
          boxShadow: '0 1px 0 rgba(91, 158, 255, 0.06), 0 4px 24px rgba(0,0,0,0.25)',
        }}
      >
        <div className="flex items-center gap-2 lg:gap-4 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer flex-shrink-0"
          >
            <div
              className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--green) 0%, #18a870 100%)',
                boxShadow: '0 3px 12px rgba(46, 216, 150, 0.40)',
              }}
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <path d="M3 8h3l1.5-4 2.5 8 1.5-4H14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="hidden sm:inline text-sm font-bold tracking-tight text-[var(--t1)]">BI Technology</span>
          </button>

          <div className="hidden sm:block w-px h-5 bg-[var(--brd)]" />
          <span className="hidden sm:inline text-[13px] font-semibold text-[var(--t3)]">Customer 360</span>
          <span className="inline sm:hidden text-[13px] font-semibold text-[var(--t3)]">C360</span>
          <div className="hidden md:block w-px h-5 bg-[var(--brd)]" />

          <nav className="flex items-center gap-0.5">
            {navLinks.map(link => {
              const active = link.path === '/'
                ? location.pathname === '/' || location.pathname.startsWith('/accounts')
                : location.pathname.startsWith(link.path)
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="relative px-2.5 md:px-3.5 py-1.5 rounded-[9px] text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap"
                  style={active ? {
                    color: 'var(--blue)',
                    background: 'linear-gradient(135deg, rgba(91, 158, 255, 0.18) 0%, rgba(91, 158, 255, 0.07) 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(91, 158, 255, 0.25), 0 0 12px rgba(91, 158, 255, 0.10)',
                  } : {
                    color: 'var(--t3)',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--t1)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--t3)' }}
                >
                  {link.label}
                  {active && (
                    <span
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full"
                      style={{ background: 'linear-gradient(90deg, transparent, var(--blue), transparent)' }}
                    />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <span className="hidden md:inline text-[11px] text-[var(--t4)] font-mono tabular-nums">{dateStr}</span>
          <div
            className="flex items-center gap-1.5 py-1 pl-2 md:pl-3 pr-1 rounded-full text-xs font-medium text-[var(--t2)] cursor-pointer transition-all hover:border-[var(--brd2)]"
            style={{
              background: 'rgba(17, 31, 50, 0.70)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="hidden md:inline">Omer</span>
            <div
              className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, var(--green), var(--cyan))',
                boxShadow: '0 2px 8px rgba(46, 216, 150, 0.35)',
              }}
            >
              OC
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1380px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 pb-16">
        {children}
      </main>
    </div>
  )
}
