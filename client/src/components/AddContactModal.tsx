import { useState, useEffect } from 'react'
import { X, UserCheck } from 'lucide-react'
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
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [contactSearch, setContactSearch] = useState('')
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

  // Load accounts for new-without-prefill mode or edit mode (account is changeable)
  useEffect(() => {
    if (isEdit || !prefilledAccount) {
      api.accounts.list({ limit: 999 }).then(d => setAccounts(d.accounts)).catch(console.error)
    }
  }, [])

  // Load all contacts when switching to "existing" mode
  useEffect(() => {
    if (mode === 'existing') {
      api.contacts.list({ limit: 999 }).then(d => setAllContacts(d.contacts)).catch(console.error)
    }
  }, [mode])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const filteredContacts = allContacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
    (c.account_name || '').toLowerCase().includes(contactSearch.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (mode === 'existing' && prefilledAccount) {
      if (!selectedContactId) { setError('Bir kontak seçin'); return }
      setSaving(true); setError('')
      try {
        await api.contacts.update(selectedContactId, { accountName: prefilledAccount.name })
        toast.success('Contact assigned')
        onSaved()
      } catch (err) {
        toast.error('Failed to assign contact')
        setError(String(err))
      } finally {
        setSaving(false)
      }
      return
    }

    if (!form.name.trim()) { setError('Contact name is required'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.contacts.update(initialData!.id, {
          accountName: form.accountName,
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
    } catch (err) {
      toast.error('Failed to save contact')
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative ml-auto h-full w-full max-w-full sm:max-w-[480px] bg-[var(--bg2)] border-l border-[var(--brd)] flex flex-col shadow-2xl">

        {/* Header */}
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
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--bg3)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode toggle — only shown when adding from an account page */}
        {prefilledAccount && !isEdit && (
          <div className="flex px-6 pt-4 gap-2">
            <button
              type="button"
              onClick={() => { setMode('new'); setError('') }}
              className={`flex-1 py-2 rounded-[10px] text-xs font-semibold transition-colors ${
                mode === 'new'
                  ? 'bg-[var(--blue)] text-white'
                  : 'bg-[var(--bg3)] text-[var(--t3)] hover:text-[var(--t1)]'
              }`}
            >
              Yeni Kontak
            </button>
            <button
              type="button"
              onClick={() => { setMode('existing'); setError('') }}
              className={`flex-1 py-2 rounded-[10px] text-xs font-semibold transition-colors ${
                mode === 'existing'
                  ? 'bg-[var(--blue)] text-white'
                  : 'bg-[var(--bg3)] text-[var(--t3)] hover:text-[var(--t1)]'
              }`}
            >
              Mevcut Kontak Ata
            </button>
          </div>
        )}

        {/* Existing contact picker */}
        {mode === 'existing' && prefilledAccount ? (
          <div className="flex-1 flex flex-col overflow-hidden px-6 py-4 gap-3">
            <Input
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
              placeholder="İsim, rol veya account ara..."
              autoFocus
            />
            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
              {filteredContacts.length === 0 ? (
                <div className="text-sm text-[var(--t4)] py-8 text-center">Kontak bulunamadı</div>
              ) : filteredContacts.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedContactId(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors ${
                    selectedContactId === c.id
                      ? 'bg-[var(--blue)]/15 border border-[var(--blue)]/40'
                      : 'hover:bg-[var(--bg3)] border border-transparent'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#a07cf018', color: '#a07cf0', border: '1px solid #a07cf030' }}
                  >
                    {c.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--t1)] truncate">{c.name}</div>
                    <div className="text-[11px] text-[var(--t4)] truncate">
                      {[c.role, c.account_name || 'Unassigned'].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {selectedContactId === c.id && (
                    <UserCheck className="w-4 h-4 text-[var(--blue)] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-[var(--red)] bg-[var(--red)]/10 rounded-lg px-3 py-2">{error}</p>}
          </div>
        ) : (
          /* New contact form or edit form */
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <Field label="Account">
              {prefilledAccount && !isEdit ? (
                /* Prefilled from account page — read only */
                <div className="h-9 flex items-center px-3 rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)]/50 text-sm text-[var(--t2)]">
                  {form.accountName || '— Unassigned —'}
                </div>
              ) : (
                /* Edit mode or new-without-prefill — editable dropdown */
                <select className={selectClass} value={form.accountName} onChange={e => set('accountName', e.target.value)}>
                  <option value="">— Unassigned —</option>
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
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--brd)] flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : mode === 'existing' ? 'Assign Contact' : isEdit ? 'Save Changes' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </div>
  )
}
