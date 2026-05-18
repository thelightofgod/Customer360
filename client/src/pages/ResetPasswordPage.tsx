import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Şifreler eşleşmiyor'); return }
    if (password.length < 6) { setError('Şifre en az 6 karakter olmalı'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Bir hata oluştu'); return }
      setDone(true)
    } catch {
      setError('Bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <p className="text-sm text-[var(--red)]">Geçersiz link</p>
          <button onClick={() => navigate('/login')} className="text-xs text-[var(--blue)] hover:underline mt-2 block mx-auto">
            Giriş sayfasına dön
          </button>
        </div>
      </div>
    )
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
            <h1 className="text-xl font-bold text-[var(--t1)]">Yeni Şifre Belirle</h1>
            <p className="text-xs text-[var(--t4)] mt-0.5">Customer 360 · BI Technology</p>
          </div>
        </div>

        <div
          className="rounded-[18px] border border-[var(--brd)] p-6"
          style={{ background: 'rgba(30, 38, 68, 0.85)', backdropFilter: 'blur(16px)' }}
        >
          {done ? (
            <div className="text-center space-y-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(46,216,150,0.12)', border: '1px solid rgba(46,216,150,0.25)' }}
              >
                <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6">
                  <path d="M4 10l4.5 4.5 7.5-8" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--t1)]">Şifre güncellendi</p>
                <p className="text-xs text-[var(--t3)] mt-1">Yeni şifrenizle giriş yapabilirsiniz.</p>
              </div>
              <Button variant="primary" className="w-full justify-center" onClick={() => navigate('/login')}>
                Giriş Yap
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">Yeni Şifre</label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">Şifre Tekrar</label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Şifreyi tekrar girin"
                  required
                />
              </div>

              {error && (
                <p className="text-xs text-[var(--red)] bg-[var(--red)]/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button variant="primary" type="submit" disabled={loading} className="w-full justify-center">
                {loading ? 'Kaydediliyor…' : 'Şifreyi Güncelle'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
