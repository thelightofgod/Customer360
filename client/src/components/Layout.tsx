import { type ReactNode, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ToastContainer from '@/components/ui/toast'
import { useAuth } from '@/lib/authContext'
import ChangePasswordModal from '@/components/ChangePasswordModal'

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { email, onLogout } = useAuth()
  const [showChangePw, setShowChangePw] = useState(false)
  const now = new Date()
  const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`

  const initials = email ? email.split('.').map(p => p[0]?.toUpperCase()).join('').slice(0, 2) : 'U'
  const displayName = email ? email.split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : ''

  const navLinks = [
    { path: '/', label: 'Accounts' },
    { path: '/subscriptions', label: 'Subscriptions' },
    { path: '/contacts', label: 'Contacts' },
    { path: '/activity', label: 'Activity' },
    { path: '/sales', label: 'Sales' },
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
            <span className="text-sm font-bold tracking-tight text-[var(--t1)]">Customer 360</span>
          </button>

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
          <span className="hidden lg:inline text-[11px] text-[var(--t2)] italic">Powered by BI Technology</span>
          <div className="hidden lg:block w-px h-4 bg-[var(--brd2)]" />
          <span className="hidden md:inline text-[11px] text-[var(--t2)] font-mono tabular-nums">{dateStr}</span>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 py-1 pl-2 md:pl-3 pr-1 rounded-full text-xs font-medium text-[var(--t2)]"
              style={{
                background: 'rgba(17, 31, 50, 0.70)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="hidden md:inline">{displayName}</span>
              <div
                className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, var(--green), var(--cyan))',
                  boxShadow: '0 2px 8px rgba(46, 216, 150, 0.35)',
                }}
              >
                {initials}
              </div>
            </div>
            <button
              onClick={() => setShowChangePw(true)}
              title="Change password"
              className="text-[11px] text-[var(--t4)] hover:text-[var(--blue)] transition-colors px-1"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
                <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={onLogout}
              title="Sign out"
              className="text-[11px] text-[var(--t4)] hover:text-[var(--red)] transition-colors px-1"
            >
              ⏻
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1380px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 pb-16">
        {children}
      </main>
      <ToastContainer />
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  )
}
