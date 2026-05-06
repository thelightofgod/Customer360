import { useState } from 'react'
import type { AccountDetail } from '@/types'
import { Button } from '@/components/ui/button'
import { Pencil, Check, X } from 'lucide-react'

interface Props { account: AccountDetail }

export default function NotesTab({ account }: Props) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(account.notes || '')
  const [saved, setSaved] = useState(account.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const r = await fetch(`/api/accounts/${account.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: text }),
      })
      if (!r.ok) throw new Error('Failed to save')
      setSaved(text)
      setEditing(false)
    } catch {
      setError('Could not save notes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setText(saved)
    setEditing(false)
    setError('')
  }

  return (
    <div
      className="rounded-[16px] p-5"
      style={{ background: 'rgba(35, 45, 78, 0.70)', border: '1px solid var(--brd)', backdropFilter: 'blur(8px)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-bold uppercase tracking-[0.8px] text-[var(--t4)] flex items-center gap-2">
          <div className="w-1.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(180deg, #f7aa28, #e09020)' }} />
          Notes
        </div>
        {!editing ? (
          <Button size="sm" onClick={() => setEditing(true)}>
            <Pencil className="w-3 h-3" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCancel} disabled={saving}>
              <X className="w-3 h-3" /> Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
              <Check className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
          rows={10}
          placeholder="Write notes about this account..."
          className="w-full rounded-[10px] px-4 py-3 text-sm text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none resize-none leading-relaxed"
          style={{ background: 'var(--bg2)', border: '1px solid var(--blue)' }}
        />
      ) : saved ? (
        <p className="text-sm text-[var(--t2)] leading-relaxed whitespace-pre-wrap">{saved}</p>
      ) : (
        <p className="text-sm text-[var(--t4)] italic">No notes yet. Click Edit to add some.</p>
      )}

      {error && (
        <p className="mt-3 text-xs text-[var(--red)] rounded-lg px-3 py-2" style={{ background: 'var(--red-bg)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
