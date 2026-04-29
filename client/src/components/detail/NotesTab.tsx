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

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/accounts/${account.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: text }),
      })
      setSaved(text)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setText(saved)
    setEditing(false)
  }

  return (
    <div className="bg-[var(--bg3)] border border-[var(--brd)] rounded-[14px] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.6px] text-[var(--t4)] flex items-center gap-2">
          <div className="w-1 h-3 rounded-full bg-[var(--amber)]" />
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
          className="w-full rounded-[10px] border border-[var(--blue)] bg-[var(--bg2)] px-4 py-3 text-sm text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none resize-none leading-relaxed"
        />
      ) : saved ? (
        <p className="text-sm text-[var(--t2)] leading-relaxed whitespace-pre-wrap">{saved}</p>
      ) : (
        <p className="text-sm text-[var(--t4)] italic">No notes yet. Click Edit to add some.</p>
      )}
    </div>
  )
}
