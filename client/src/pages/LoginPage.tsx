import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props { onLogin: (email: string) => void }

export default function LoginPage({ onLogin }: Props) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Giriş başarısız'); return }
      onLogin(data.email)
    } catch {
      setError('Bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'var(--bg)',
        backgroundImage: `
          radial-gradient(ellipse 90% 70% at -8% -15%, rgba(91,158,255,0.14) 0%, transparent 55%),
          radial-gradient(ellipse 65% 55% at 108% -8%, rgba(160,124,240,0.11) 0%, transparent 50%)
        `,
      }}
    >
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--green) 0%, #18a870 100%)',
              boxShadow: '0 6px 24px rgba(46,216,150,0.45)',
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-6 h-6">
              <path d="M3 8h3l1.5-4 2.5 8 1.5-4H14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[var(--t1)]">Customer 360</h1>
            <p className="text-xs text-[var(--t4)] mt-0.5">Powered by BI Technology</p>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-[18px] border border-[var(--brd)] p-6 space-y-4"
          style={{ background: 'rgba(30, 38, 68, 0.85)', backdropFilter: 'blur(16px)' }}
        >
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">E-posta</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ad.soyad@bitechnology.com"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">Şifre</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--red)] bg-[var(--red)]/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button variant="primary" type="submit" disabled={loading} className="w-full justify-center">
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </Button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-xs text-[var(--t4)] hover:text-[var(--blue)] transition-colors"
            >
              Şifremi unuttum
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
