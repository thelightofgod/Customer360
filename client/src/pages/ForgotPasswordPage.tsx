import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Bir hata oluştu'); return }
      setSent(true)
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
            <h1 className="text-xl font-bold text-[var(--t1)]">Şifremi Unuttum</h1>
            <p className="text-xs text-[var(--t4)] mt-0.5">Customer 360 · BI Technology</p>
          </div>
        </div>

        <div
          className="rounded-[18px] border border-[var(--brd)] p-6"
          style={{ background: 'rgba(30, 38, 68, 0.85)', backdropFilter: 'blur(16px)' }}
        >
          {sent ? (
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
                <p className="text-sm font-semibold text-[var(--t1)]">Mail gönderildi</p>
                <p className="text-xs text-[var(--t3)] mt-1 leading-relaxed">
                  <span className="text-[var(--blue)]">{email}</span> adresine şifre sıfırlama linki gönderdik. Gelen kutunuzu kontrol edin.
                </p>
                <p className="text-xs text-[var(--t4)] mt-2">Link 1 saat geçerlidir.</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="text-xs text-[var(--blue)] hover:underline"
              >
                Giriş sayfasına dön
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[var(--t3)] leading-relaxed">
                Kayıtlı e-posta adresinizi girin. Şifre sıfırlama linki göndereceğiz.
              </p>
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

              {error && (
                <p className="text-xs text-[var(--red)] bg-[var(--red)]/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button variant="primary" type="submit" disabled={loading} className="w-full justify-center">
                {loading ? 'Gönderiliyor…' : 'Link Gönder'}
              </Button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-center text-xs text-[var(--t4)] hover:text-[var(--t2)] transition-colors"
              >
                ← Giriş sayfasına dön
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
