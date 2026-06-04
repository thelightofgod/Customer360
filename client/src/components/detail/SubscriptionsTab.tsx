import { useState } from 'react'
import type { AccountDetail, SubscriptionDetail } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, RotateCcw, X } from 'lucide-react'
import { fmtCurrency, fmtDate, groupIcon } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'

interface Period { period_start: string; period_end: string; amount: number; original_amount?: number }

interface Props {
  account: AccountDetail
  onAdd?: () => void
  onEdit?: (sub: SubscriptionDetail) => void
  onDelete?: (subId: string) => void
  onRefresh?: () => void
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

function fmtDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}


function autoGenerate(commitmentEndDate: string, years: number, annualAmount: number): Period[] {
  const endFull = new Date(commitmentEndDate)
  const startFull = new Date(endFull)
  startFull.setFullYear(startFull.getFullYear() - years)
  startFull.setDate(startFull.getDate() + 1)
  const periods: Period[] = []
  for (let i = 0; i < years; i++) {
    const pStart = new Date(startFull)
    pStart.setFullYear(pStart.getFullYear() + i)
    const pEnd = new Date(pStart)
    pEnd.setFullYear(pEnd.getFullYear() + 1)
    pEnd.setDate(pEnd.getDate() - 1)
    periods.push({ period_start: fmtDateInput(pStart), period_end: fmtDateInput(pEnd), amount: annualAmount })
  }
  return periods
}

function initPeriods(s: SubscriptionDetail): Period[] {
  if (s.payment_periods && s.payment_periods.length > 0)
    return s.payment_periods.map(p => ({
      period_start: p.period_start,
      period_end: p.period_end,
      amount: p.amount,
      original_amount: p.original_amount ?? undefined,
    }))
  if (s.subscription_years && s.commitment_end_date)
    return autoGenerate(s.commitment_end_date, s.subscription_years, s.total_price)
  return []
}

function discountPct(amount: number, original: number | undefined): number | null {
  if (original === undefined || original <= 0 || amount >= original) return null
  return Math.round((1 - amount / original) * 1000) / 10
}

export default function SubscriptionsTab({ account, onAdd, onEdit, onDelete, onRefresh }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingPeriods, setEditingPeriods] = useState<Period[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [periodModal, setPeriodModal] = useState<{ idx: number; draft: Period } | null>(null)

  const grouped = groupBy(account.subscriptions, s => s.product_group)
  const groups = Object.keys(grouped).sort()

  const total = account.subscriptions.reduce((sum, s) => {
    if (s.id === expandedId)
      return sum + editingPeriods.reduce((ps, p) => ps + (Number(p.amount) || 0), 0)
    if (s.payment_periods && s.payment_periods.length > 0)
      return sum + s.payment_periods.reduce((ps, p) => ps + p.amount, 0)
    return sum
  }, 0)

  function toggleExpand(s: SubscriptionDetail) {
    if (expandedId === s.id) {
      setExpandedId(null)
    } else {
      setExpandedId(s.id)
      setEditingPeriods(initPeriods(s))
    }
  }

  function resetToAuto(s: SubscriptionDetail) {
    if (s.subscription_years && s.commitment_end_date)
      setEditingPeriods(autoGenerate(s.commitment_end_date, s.subscription_years, s.total_price))
  }

  function addPeriod(defaultAmount = 0) {
    const last = editingPeriods[editingPeriods.length - 1]
    if (last) {
      const nextStart = new Date(last.period_end)
      nextStart.setDate(nextStart.getDate() + 1)
      const nextEnd = new Date(nextStart)
      nextEnd.setFullYear(nextEnd.getFullYear() + 1)
      nextEnd.setDate(nextEnd.getDate() - 1)
      setEditingPeriods(prev => [...prev, { period_start: fmtDateInput(nextStart), period_end: fmtDateInput(nextEnd), amount: last.amount }])
    } else {
      setEditingPeriods(prev => [...prev, { period_start: '', period_end: '', amount: defaultAmount }])
    }
  }

  function removePeriod(i: number) {
    setEditingPeriods(prev => prev.filter((_, idx) => idx !== i))
  }

  function openPeriodEdit(i: number) {
    setPeriodModal({ idx: i, draft: { ...editingPeriods[i] } })
  }

  function setDraftField(field: keyof Period, value: string | number | undefined) {
    setPeriodModal(prev => prev ? { ...prev, draft: { ...prev.draft, [field]: value } } : null)
  }

  function toggleDraftDiscount() {
    if (!periodModal) return
    const { draft } = periodModal
    if (draft.original_amount !== undefined) {
      setPeriodModal(prev => prev ? { ...prev, draft: { ...draft, amount: draft.original_amount!, original_amount: undefined } } : null)
    } else {
      setPeriodModal(prev => prev ? { ...prev, draft: { ...draft, original_amount: draft.amount } } : null)
    }
  }

  function savePeriodEdit() {
    if (!periodModal) return
    setEditingPeriods(prev => prev.map((p, i) => i === periodModal.idx ? { ...periodModal.draft } : p))
    setPeriodModal(null)
  }

  async function savePeriods(subId: string) {
    setSavingId(subId)
    try {
      await api.subscriptions.update(subId, {
        paymentPeriods: editingPeriods.map(p => ({
          periodStart: p.period_start,
          periodEnd: p.period_end,
          amount: p.amount,
          originalAmount: p.original_amount ?? null,
        })),
      })
      toast.success('Payment schedule saved')
      onRefresh?.()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSavingId(null)
    }
  }

  if (account.subscriptions.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--t4)]">
        <div className="text-3xl mb-2">📦</div>
        <div className="text-sm font-semibold text-[var(--t3)] mb-3">No active subscriptions</div>
        {onAdd && <Button onClick={onAdd}><Plus className="w-3.5 h-3.5" /> Add Subscription</Button>}
      </div>
    )
  }

  const draftDiscount = periodModal ? discountPct(periodModal.draft.amount, periodModal.draft.original_amount) : null

  return (
    <>
    <div className="bg-[var(--bg3)] border border-[var(--brd)] rounded-[14px] overflow-hidden">
      {groups.map(group => (
        <div key={group}>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-black/20 border-b border-[var(--brd)] text-[11px] font-semibold uppercase tracking-[0.7px] text-[var(--t4)]">
            <span>{groupIcon(group)}</span>
            <span>{group}</span>
          </div>

          {grouped[group].map(s => {
            const isExpanded = expandedId === s.id
            const isSaved = !!(s.payment_periods && s.payment_periods.length > 0)
            const canAutoGen = !!(s.subscription_years && s.commitment_end_date)

            return (
              <div key={s.id} className="border-b border-white/[0.02] last:border-0">
                {/* Subscription row */}
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.012] transition-colors">
                  <button
                    onClick={() => toggleExpand(s)}
                    className="w-5 h-5 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--blue)] transition-colors flex-shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--t1)]">{s.product_name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {s.subscription_years && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] font-mono" style={{ background: 'rgba(91,158,255,0.12)', color: 'var(--blue)' }}>
                          {s.subscription_years} yr
                        </span>
                      )}
                      {isSaved && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-[4px]" style={{ background: 'rgba(46,216,150,0.10)', color: 'var(--green)' }}>
                          schedule ✓
                        </span>
                      )}
                      {s.commitment_end_date && (
                        <span className="text-[10px] text-[var(--t4)]">end: {fmtDate(s.commitment_end_date)}</span>
                      )}
                    </div>
                  </div>

                  {(onEdit || onDelete) && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {deletingId === s.id ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { onDelete?.(s.id); setDeletingId(null) }} className="text-[10px] text-[var(--red)] hover:underline font-medium">Del</button>
                          <button onClick={() => setDeletingId(null)} className="text-[10px] text-[var(--t4)] hover:underline">✕</button>
                        </div>
                      ) : (
                        <>
                          {onEdit && (
                            <button onClick={() => onEdit(s)} className="w-6 h-6 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--bg2)] transition-colors">
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => setDeletingId(s.id)} className="w-6 h-6 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded period list */}
                {isExpanded && (
                  <div className="border-t border-[var(--brd)] px-4 py-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    {editingPeriods.length === 0 ? (
                      <div className="text-xs text-[var(--t4)] py-3 text-center">
                        No periods added yet — add one below
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {editingPeriods.map((p, i) => {
                          const pct = discountPct(p.amount, p.original_amount)
                          return (
                            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-[8px] hover:bg-white/[0.03] group">
                              <span className="flex-1 text-xs font-mono" style={{ color: 'var(--blue)' }}>
                                {fmtDate(p.period_start) || '—'} – {fmtDate(p.period_end) || '—'}
                              </span>
                              <span className="w-14 flex justify-end">
                                {pct !== null && (
                                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-[4px] whitespace-nowrap"
                                    style={{ background: 'rgba(247,170,40,0.12)', color: '#f7aa28' }}>
                                    -%{pct}
                                  </span>
                                )}
                              </span>
                              <span className="w-20 text-right text-xs font-mono font-semibold text-[var(--t1)]">
                                {fmtCurrency(p.amount)}
                              </span>
                              <button
                                onClick={() => openPeriodEdit(i)}
                                className="w-6 h-6 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => removePeriod(i)}
                                className="w-6 h-6 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors text-xs opacity-0 group-hover:opacity-100"
                              >
                                ✕
                              </button>
                            </div>
                          )
                        })}
                        <div className="flex justify-end pt-1 pr-2">
                          <span className="text-xs font-mono font-bold" style={{ color: 'var(--green)' }}>
                            {fmtCurrency(editingPeriods.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => addPeriod(s.total_price)} className="text-[11px] text-[var(--blue)] hover:underline font-semibold flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add Period
                        </button>
                        {canAutoGen && (
                          <button onClick={() => resetToAuto(s)} className="text-[11px] text-[var(--t4)] hover:text-[var(--t2)] flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Auto Generate
                          </button>
                        )}
                      </div>
                      <Button variant="primary" size="sm" disabled={savingId === s.id} onClick={() => savePeriods(s.id)}>
                        {savingId === s.id ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      <div className="flex justify-between items-center px-4 py-3.5 bg-black/20 border-t border-[var(--brd)]">
        <span className="text-xs font-semibold uppercase tracking-[0.5px] text-[var(--t3)]">Total Annual Value</span>
        <div className="flex items-center gap-3">
          {onAdd && (
            <Button size="sm" onClick={onAdd}>
              <Plus className="w-3 h-3" /> Add
            </Button>
          )}
          <span className="text-lg font-bold font-mono text-[var(--green)]">{fmtCurrency(total)}</span>
        </div>
      </div>
    </div>

    {/* Period Edit Popup */}
    {periodModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPeriodModal(null)} />
        <div
          className="relative w-full max-w-sm mx-4 rounded-[16px] border border-[var(--brd)] shadow-2xl flex flex-col"
          style={{ background: 'var(--bg2)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--brd)]">
            <span className="text-sm font-bold text-[var(--t1)]">Edit Period</span>
            <button onClick={() => setPeriodModal(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--bg3)] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">Start</label>
                <Input type="date" value={periodModal.draft.period_start} onChange={e => setDraftField('period_start', e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">End</label>
                <Input type="date" value={periodModal.draft.period_end} onChange={e => setDraftField('period_end', e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            {periodModal.draft.original_amount !== undefined ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">List Price (€)</label>
                  <Input
                    type="number" min="0"
                    value={periodModal.draft.original_amount}
                    onChange={e => setDraftField('original_amount', Number(e.target.value))}
                    className="h-9 text-xs text-right font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">Discounted Price (€)</label>
                    {draftDiscount !== null && (
                      <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-[4px]"
                        style={{ background: 'rgba(247,170,40,0.12)', color: '#f7aa28' }}>
                        -%{draftDiscount}
                      </span>
                    )}
                  </div>
                  <Input
                    type="number" min="0"
                    value={periodModal.draft.amount}
                    onChange={e => setDraftField('amount', Number(e.target.value))}
                    className="h-9 text-xs text-right font-mono"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleDraftDiscount}
                  className="text-[11px] text-[var(--t4)] hover:text-[var(--red)] transition-colors"
                >
                  Remove discount
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">Invoice Amount (€)</label>
                  <Input
                    type="number" min="0"
                    value={periodModal.draft.amount}
                    onChange={e => setDraftField('amount', Number(e.target.value))}
                    className="h-9 text-xs text-right font-mono"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleDraftDiscount}
                  className="text-[11px] text-[var(--blue)] hover:underline font-semibold"
                >
                  + Add discounted price
                </button>
              </>
            )}
          </div>

          <div className="px-5 py-4 border-t border-[var(--brd)] flex justify-end gap-2">
            <Button type="button" onClick={() => setPeriodModal(null)}>Cancel</Button>
            <Button variant="primary" type="button" onClick={savePeriodEdit}>OK</Button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
