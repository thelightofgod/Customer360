import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  onClose: () => void
}

export default function ChangePasswordModal({ onClose }: Props) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) { setError('New passwords do not match'); return }
    if (next.length < 6) { setError('New password must be at least 6 characters'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'An error occurred'); return }
      setDone(true)
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-[380px] rounded-[18px] border border-[var(--brd)] p-6"
        style={{ background: 'rgba(22, 30, 54, 0.97)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-[var(--t1)]">Change Password</h2>
          <button onClick={onClose} className="text-[var(--t4)] hover:text-[var(--t2)] transition-colors text-lg leading-none">×</button>
        </div>

        {done ? (
          <div className="text-center space-y-4 py-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(46,216,150,0.12)', border: '1px solid rgba(46,216,150,0.25)' }}
            >
              <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6">
                <path d="M4 10l4.5 4.5 7.5-8" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--t1)]">Password updated</p>
              <p className="text-xs text-[var(--t3)] mt-1">Use your new password on your next login.</p>
            </div>
            <Button variant="primary" className="w-full justify-center" onClick={onClose}>
              OK
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">Current Password</label>
              <Input
                type="password"
                value={current}
                onChange={e => setCurrent(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
              />
            </div>

            <div className="h-px bg-[var(--brd)] my-1" />

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">New Password</label>
              <Input
                type="password"
                value={next}
                onChange={e => setNext(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">Confirm New Password</label>
              <Input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-[var(--red)] bg-[var(--red)]/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" className="flex-1 justify-center" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1 justify-center" disabled={loading}>
                {loading ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
