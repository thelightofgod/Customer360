import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { fmtCurrency, fmtDate } from '@/lib/utils'
import type { PaymentSchedule } from '@/types'

interface Props {
  schedules: PaymentSchedule[]
  accountName: string
  onRefresh: () => void
}

interface RowForm {
  periodStart: string
  periodEnd: string
  amount: string
  invoiceDate: string
}

const emptyForm = (): RowForm => ({ periodStart: '', periodEnd: '', amount: '', invoiceDate: '' })

export default function PaymentScheduleSection({ schedules, accountName, onRefresh }: Props) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<RowForm>(emptyForm())
  const [saving, setSaving] = useState(false)

  function startAdd() {
    setAdding(true)
    setEditingId(null)
    setForm(emptyForm())
  }

  function startEdit(s: PaymentSchedule) {
    setEditingId(s.id)
    setAdding(false)
    setForm({
      periodStart: s.period_start,
      periodEnd: s.period_end,
      amount: String(s.amount),
      invoiceDate: s.invoice_date || '',
    })
  }

  function cancelForm() {
    setAdding(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleSave() {
    if (!form.periodStart || !form.periodEnd || !form.amount) {
      toast.error('Period start, end and amount are required')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await api.paymentSchedules.update(editingId, {
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          amount: Number(form.amount),
          invoiceDate: form.invoiceDate || null,
        })
        toast.success('Row updated')
      } else {
        await api.paymentSchedules.create({
          accountName,
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          amount: Number(form.amount),
          invoiceDate: form.invoiceDate || null,
        })
        toast.success('Row added')
      }
      cancelForm()
      onRefresh()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.paymentSchedules.delete(id)
      toast.success('Row deleted')
      setDeletingId(null)
      onRefresh()
    } catch {
      toast.error('Failed to delete')
      setDeletingId(null)
    }
  }

  const totalAmount = schedules.reduce((s, r) => s + r.amount, 0)

  return (
    <div
      className="rounded-[16px] overflow-hidden"
      style={{ background: 'rgba(35, 45, 78, 0.70)', border: '1px solid var(--brd)', backdropFilter: 'blur(8px)' }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--brd)]">
        <div className="text-xs font-bold uppercase tracking-[0.8px] text-[var(--t4)] flex items-center gap-2">
          <div className="w-1.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(180deg, #f7aa28, #e89620)' }} />
          License Rental Period / Payment Schedule
        </div>
        <Button size="sm" onClick={startAdd}>
          <Plus className="w-3 h-3" /> Add Row
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[540px]">
          <div
            className="grid grid-cols-[1fr_1fr_120px_120px_64px] gap-1 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.8px] text-[var(--t4)]"
            style={{ background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--brd)' }}
          >
            <span>Period Start</span>
            <span>Period End</span>
            <span className="text-right">Invoice Amount</span>
            <span className="text-center">Invoice Date</span>
            <span />
          </div>

          {schedules.length === 0 && !adding && (
            <div className="text-center py-8 text-sm text-[var(--t4)]">No payment schedule added yet</div>
          )}

          {schedules.map(s => (
            <div key={s.id}>
              {editingId === s.id ? (
                <div className="grid grid-cols-[1fr_1fr_120px_120px_64px] gap-1 items-center px-5 py-2.5 border-b border-white/[0.03]">
                  <Input type="date" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} className="h-8 text-xs" />
                  <Input type="date" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} className="h-8 text-xs" />
                  <Input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="h-8 text-xs text-right" />
                  <Input type="date" value={form.invoiceDate} onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))} className="h-8 text-xs" />
                  <div className="flex gap-1 justify-end">
                    <button onClick={handleSave} disabled={saving} className="w-7 h-7 rounded flex items-center justify-center text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelForm} className="w-7 h-7 rounded flex items-center justify-center text-[var(--t4)] hover:bg-white/5 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[1fr_1fr_120px_120px_64px] gap-1 items-center px-5 py-3 border-b border-white/[0.03] text-sm hover:bg-white/[0.01] transition-colors">
                  <span className="text-[var(--t2)] font-medium">{fmtDate(s.period_start)}</span>
                  <span className="text-[var(--t2)]">{fmtDate(s.period_end)}</span>
                  <span className="font-mono font-bold text-right" style={{ color: 'var(--green)' }}>{fmtCurrency(s.amount)}</span>
                  <span className="text-center text-[var(--t3)] text-xs">{s.invoice_date ? fmtDate(s.invoice_date) : '—'}</span>
                  <div className="flex items-center justify-end gap-1">
                    {deletingId === s.id ? (
                      <>
                        <button onClick={() => handleDelete(s.id)} className="text-[10px] text-[var(--red)] hover:underline font-bold">Del</button>
                        <button onClick={() => setDeletingId(null)} className="text-[10px] text-[var(--t4)] hover:underline ml-1">✕</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(s)} className="w-6 h-6 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-white/[0.06] transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => setDeletingId(s.id)} className="w-6 h-6 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {adding && (
            <div className="grid grid-cols-[1fr_1fr_120px_120px_64px] gap-1 items-center px-5 py-2.5 border-b border-white/[0.03]" style={{ background: 'rgba(91,158,255,0.04)' }}>
              <Input type="date" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} className="h-8 text-xs" />
              <Input type="date" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} className="h-8 text-xs" />
              <Input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="h-8 text-xs text-right" />
              <Input type="date" value={form.invoiceDate} onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))} className="h-8 text-xs" />
              <div className="flex gap-1 justify-end">
                <button onClick={handleSave} disabled={saving} className="w-7 h-7 rounded flex items-center justify-center text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={cancelForm} className="w-7 h-7 rounded flex items-center justify-center text-[var(--t4)] hover:bg-white/5 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {schedules.length > 0 && (
        <div className="flex justify-between items-center px-5 py-3.5" style={{ background: 'rgba(0,0,0,0.15)', borderTop: '1px solid var(--brd)' }}>
          <span className="text-xs font-bold uppercase tracking-[0.7px] text-[var(--t3)]">Total</span>
          <span className="text-base font-bold font-mono" style={{ color: 'var(--green)', textShadow: '0 0 16px rgba(46,216,150,0.4)' }}>
            {fmtCurrency(totalAmount)}
          </span>
        </div>
      )}
    </div>
  )
}
