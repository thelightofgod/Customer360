import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

interface Props {
  onClose: () => void
  onCreated: () => void
}

const TIERS = ['Strategic', 'Growth', 'Core', 'New Logo']
const EDITIONS = ['Qlik Cloud Enterprise', 'Qlik Cloud Business', 'Qlik Cloud Standard', '— Prospect —']
const LICENSE_MODELS = ['Subscription', 'Maintenance', 'Mixed']
const CSMS = ['Ayşe Kara', 'Mehmet Koç', 'Ömer Çıtak']

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

const selectClass = 'h-9 w-full rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] px-3 text-sm text-[var(--t1)] focus:outline-none focus:border-[var(--blue)] transition-colors appearance-none cursor-pointer'

export default function AddAccountModal({ onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', sector: '', tier: 'Growth', edition: 'Qlik Cloud Business',
    licenseModel: '', csm: '', contractStart: '', renewalDate: '',
    arr: '', nps: '', slaCompliance: '', avgResolution: '', notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Account name is required'); return }
    setSaving(true)
    setError('')
    try {
      await api.accounts.create({
        name: form.name.trim(),
        sector: form.sector,
        tier: form.tier,
        edition: form.edition,
        licenseModel: form.licenseModel || null,
        csm: form.csm,
        contractStart: form.contractStart || undefined,
        renewalDate: form.renewalDate || undefined,
        arr: form.arr ? Number(form.arr) : 0,
        nps: form.nps ? Number(form.nps) : null,
        slaCompliance: form.slaCompliance ? Number(form.slaCompliance) : null,
        avgResolution: form.avgResolution || undefined,
        notes: form.notes || undefined,
      })
      onCreated()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative ml-auto h-full w-full max-w-[520px] bg-[var(--bg2)] border-l border-[var(--brd)] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--brd)]">
          <div>
            <h2 className="text-base font-bold text-[var(--t1)]">New Account</h2>
            <p className="text-xs text-[var(--t4)] mt-0.5">Add a new customer or prospect</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--bg3)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Section: Basic */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[var(--t4)] mb-3 flex items-center gap-2">
              <div className="w-1 h-3 rounded-full bg-[var(--blue)]" /> Basic Info
            </div>
            <div className="space-y-3">
              <Field label="Account Name" required>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Trendyol" autoFocus />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sector / Industry">
                  <Input value={form.sector} onChange={e => set('sector', e.target.value)} placeholder="e.g. E-Commerce" />
                </Field>
                <Field label="Tier">
                  <select className={selectClass} value={form.tier} onChange={e => set('tier', e.target.value)}>
                    {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Edition">
                  <select className={selectClass} value={form.edition} onChange={e => set('edition', e.target.value)}>
                    {EDITIONS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </Field>
                <Field label="License Model">
                  <select className={selectClass} value={form.licenseModel} onChange={e => set('licenseModel', e.target.value)}>
                    <option value="">— None —</option>
                    {LICENSE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="CSM Assigned">
                <select className={selectClass} value={form.csm} onChange={e => set('csm', e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {CSMS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Section: Contract */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[var(--t4)] mb-3 flex items-center gap-2">
              <div className="w-1 h-3 rounded-full bg-[var(--green)]" /> Contract
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contract Start">
                  <Input type="date" value={form.contractStart} onChange={e => set('contractStart', e.target.value)} />
                </Field>
                <Field label="Renewal Date">
                  <Input type="date" value={form.renewalDate} onChange={e => set('renewalDate', e.target.value)} />
                </Field>
              </div>
              <Field label="ARR (€)">
                <Input type="number" min="0" value={form.arr} onChange={e => set('arr', e.target.value)} placeholder="e.g. 120000" />
              </Field>
            </div>
          </div>

          {/* Section: Performance */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[var(--t4)] mb-3 flex items-center gap-2">
              <div className="w-1 h-3 rounded-full bg-[var(--purple)]" /> Performance
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Field label="NPS (1-10)">
                  <Input type="number" min="1" max="10" value={form.nps} onChange={e => set('nps', e.target.value)} placeholder="8" />
                </Field>
                <Field label="SLA Compliance %">
                  <Input type="number" min="0" max="100" value={form.slaCompliance} onChange={e => set('slaCompliance', e.target.value)} placeholder="95" />
                </Field>
                <Field label="Avg Resolution">
                  <Input value={form.avgResolution} onChange={e => set('avgResolution', e.target.value)} placeholder="4.2h" />
                </Field>
              </div>
            </div>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes..."
              rows={3}
              className="w-full rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--blue)] transition-colors resize-none"
            />
          </Field>

          {error && <p className="text-xs text-[var(--red)] bg-[var(--red)]/10 rounded-lg px-3 py-2">{error}</p>}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--brd)] flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit as any} disabled={saving}>
            {saving ? 'Saving…' : 'Create Account'}
          </Button>
        </div>
      </div>
    </div>
  )
}
