import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { Account, Contact } from '@/types'

interface Props {
  onClose: () => void
  onSaved: () => void
  prefilledAccount?: { id: string; name: string }
  initialData?: Contact
}

const TYPES = ['Sponsor', 'Technical', 'Business', 'Admin', 'General']
const selectClass = 'h-9 w-full rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] px-3 text-sm text-[var(--t1)] focus:outline-none focus:border-[var(--blue)] transition-colors appearance-none cursor-pointer'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">
        {label}{required && <span className="text-[var(--red)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function AddContactModal({ onClose, onSaved, prefilledAccount, initialData }: Props) {
  const isEdit = !!initialData
  const [accounts, setAccounts] = useState<Account[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    accountName: initialData?.account_name || prefilledAccount?.name || '',
    name: initialData?.name || '',
    role: initialData?.role || '',
    contactType: initialData?.contact_type
      ? initialData.contact_type.charAt(0).toUpperCase() + initialData.contact_type.slice(1)
      : 'Sponsor',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    notes: '',
  })

  useEffect(() => {
    if (!prefilledAccount && !isEdit) {
      api.accounts.list({ filter: 'active', limit: 999 }).then(d => setAccounts(d.accounts)).catch(console.error)
    }
  }, [prefilledAccount, isEdit])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.accountName) { setError('Account is required'); return }
    if (!form.name.trim()) { setError('Contact name is required'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.contacts.update(initialData!.id, {
          name: form.name.trim(),
          role: form.role,
          contactType: form.contactType,
          email: form.email || '',
          phone: form.phone || '',
        })
        toast.success('Contact updated')
      } else {
        await api.contacts.create({
          accountName: form.accountName,
          name: form.name.trim(),
          role: form.role,
          contactType: form.contactType,
          email: form.email || undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        })
        toast.success('Contact added')
      }
      onSaved()
    } catch (e) {
      toast.error('Failed to save contact')
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-full sm:max-w-[480px] bg-[var(--bg2)] border-l border-[var(--brd)] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--brd)]">
          <div>
            <h2 className="text-base font-bold text-[var(--t1)]">{isEdit ? 'Edit Contact' : 'New Contact'}</h2>
            <p className="text-xs text-[var(--t4)] mt-0.5">
              {isEdit
                ? `Editing ${initialData!.name}`
                : prefilledAccount
                  ? `Adding to ${prefilledAccount.name}`
                  : 'Add a contact to an account'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--bg3)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Account" required>
            {isEdit || prefilledAccount ? (
              <div className="h-9 flex items-center px-3 rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)]/50 text-sm text-[var(--t2)]">
                {form.accountName}
              </div>
            ) : (
              <select className={selectClass} value={form.accountName} onChange={e => set('accountName', e.target.value)}>
                <option value="">— Select account —</option>
                {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            )}
          </Field>

          <Field label="Contact Name" required>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Emre Yılmaz" autoFocus />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Role / Title">
              <Input value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. BI Manager" />
            </Field>
            <Field label="Contact Type">
              <select className={selectClass} value={form.contactType} onChange={e => set('contactType', e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@company.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+90 5xx xxx xx xx" />
            </Field>
          </div>

          {!isEdit && (
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                placeholder="Optional notes..."
                className="w-full rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--blue)] transition-colors resize-none"
              />
            </Field>
          )}

          {error && <p className="text-xs text-[var(--red)] bg-[var(--red)]/10 rounded-lg px-3 py-2">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t border-[var(--brd)] flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Contact'}
          </Button>
        </div>
      </div>
    </div>
  )
}
