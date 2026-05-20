import { useEffect, useState } from 'react'
import type { AccountDetail, Deal } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { fmtCurrency, fmtDate } from '@/lib/utils'
import AddDealModal from '@/components/AddDealModal'

interface Props {
  account: AccountDetail
}

const TYPE_COLORS: Record<string, string> = {
  'New Sale': 'var(--green)',
  'Renewal': 'var(--blue)',
  'Add-on License': 'var(--amber)',
}

const STATUS_VARIANTS: Record<string, 'green' | 'blue' | 'muted'> = {
  'Active': 'green',
  'Proposal': 'blue',
  'Completed': 'muted',
}

export default function DealsTab({ account }: Props) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function fetchDeals() {
    setLoading(true)
    api.deals.list(account.name)
      .then(d => setDeals(d.deals))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDeals() }, [])

  async function handleDelete(id: string) {
    try {
      await api.deals.delete(id)
      toast.success('Deal deleted')
      setDeletingId(null)
      fetchDeals()
    } catch {
      toast.error('Failed to delete')
      setDeletingId(null)
    }
  }

  if (loading) return <div className="text-center py-12 text-sm text-[var(--t4)]">Loading…</div>

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-[var(--t4)]">{deals.length} deal</div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> New Deal
        </Button>
      </div>

      {deals.length === 0 ? (
        <div className="text-center py-16 text-[var(--t4)]">
          <div className="text-3xl mb-2 opacity-40">📋</div>
          <div className="text-sm">No deals yet</div>
          <div className="text-xs mt-1 opacity-60">Add a New Sale, Renewal or Add-on License</div>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map(deal => {
            const isExpanded = expandedId === deal.id
            const typeColor = TYPE_COLORS[deal.deal_type] || 'var(--t3)'
            return (
              <div
                key={deal.id}
                className="rounded-[16px] overflow-hidden transition-all"
                style={{ background: 'rgba(17,31,50,0.75)', border: '1px solid var(--brd)', backdropFilter: 'blur(8px)' }}
              >
                {/* Deal header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: typeColor }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[var(--t1)]">{deal.deal_type}</span>
                      <Badge variant={STATUS_VARIANTS[deal.deal_status] || 'muted'} className="text-[10px]">
                        {deal.deal_status}
                      </Badge>
                      {deal.subscription_years && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--t3)' }}>
                          {deal.subscription_years} yr
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--t4)] flex-wrap">
                      {deal.contract_start && <span>{fmtDate(deal.contract_start)}</span>}
                      {deal.contract_start && deal.contract_end && <span>→</span>}
                      {deal.contract_end && <span>{fmtDate(deal.contract_end)}</span>}
                      {deal.lines.length > 0 && (
                        <span className="opacity-60">· {deal.lines.length} product{deal.lines.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {deal.total_value > 0 && (
                      <span className="text-base font-bold font-mono" style={{ color: 'var(--green)', textShadow: '0 0 16px rgba(46,216,150,0.3)' }}>
                        {fmtCurrency(deal.total_value)}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <button onClick={() => setExpandedId(isExpanded ? null : deal.id)}
                        className="w-7 h-7 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-white/[0.06] transition-colors">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditingDeal(deal)}
                        className="w-7 h-7 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-white/[0.06] transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {deletingId === deal.id ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleDelete(deal.id)} className="text-[10px] text-[var(--red)] hover:underline font-bold">Del</button>
                          <button onClick={() => setDeletingId(null)} className="text-[10px] text-[var(--t4)] hover:underline">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingId(deal.id)}
                          className="w-7 h-7 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[var(--brd)] px-5 py-4 space-y-4" style={{ background: 'rgba(0,0,0,0.15)' }}>

                    {/* Products */}
                    {deal.lines.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.7px] text-[var(--t4)] mb-2">Products</div>
                        <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid var(--brd)' }}>
                          {deal.lines.map((line, i) => (
                            <div key={i} className="grid grid-cols-[2fr_60px_90px_90px_100px] gap-1 items-center px-4 py-2.5 text-xs"
                              style={{ borderBottom: i < deal.lines.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                              <div>
                                <div className="font-medium text-[var(--t1)]">{line.product_name}</div>
                                <div className="text-[10px] text-[var(--t4)]">{line.product_group}</div>
                              </div>
                              <span className="font-mono text-center text-[var(--t2)]">{line.quantity} <span className="text-[10px] text-[var(--t4)]">{line.unit}</span></span>
                              <span className="font-mono text-right text-[var(--t3)] line-through opacity-60">{line.list_price > 0 ? fmtCurrency(line.list_price) : '—'}</span>
                              <span className="font-mono text-right text-[var(--t2)]">{fmtCurrency(line.unit_price)}</span>
                              <span className="font-mono font-bold text-right" style={{ color: 'var(--green)' }}>{fmtCurrency(line.total_price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment Schedule */}
                    {deal.payment_schedule.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.7px] text-[var(--t4)] mb-2">Payment Schedule</div>
                        <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid var(--brd)' }}>
                          {deal.payment_schedule.map((ps, i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_120px_120px] gap-1 items-center px-4 py-2.5 text-xs"
                              style={{ borderBottom: i < deal.payment_schedule.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                              <span className="text-[var(--t2)]">{fmtDate(ps.period_start)}</span>
                              <span className="text-[var(--t2)]">{fmtDate(ps.period_end)}</span>
                              <span className="font-mono font-bold text-right" style={{ color: 'var(--green)' }}>{fmtCurrency(ps.amount)}</span>
                              <span className="text-center text-[var(--t4)]">{ps.invoice_date ? fmtDate(ps.invoice_date) : '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extra info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {deal.partner_name && <InfoChip label="Partner" value={deal.partner_name} />}
                      {deal.partner_margin != null && <InfoChip label="Margin" value={`${deal.partner_margin}%`} />}
                      {deal.partner_license_price != null && <InfoChip label="Partner Price" value={fmtCurrency(deal.partner_license_price)} />}
                      {deal.invoice_date && <InfoChip label="Invoice Date" value={fmtDate(deal.invoice_date) || '—'} />}
                      {deal.payment_terms && <InfoChip label="Payment Terms" value={deal.payment_terms} />}
                      {deal.finance_contact && <InfoChip label="Finance Contact" value={deal.finance_contact} />}
                      {deal.consulting_days && <InfoChip label="Consulting" value={deal.consulting_days} />}
                      {deal.training_info && <InfoChip label="Training" value={deal.training_info} />}
                      {deal.currency && <InfoChip label="Currency" value={deal.currency} />}
                    </div>

                    {/* Ek Lisans info */}
                    {deal.deal_type === 'Add-on License' && deal.remaining_months != null && (
                      <div className="grid grid-cols-2 gap-2">
                        <InfoChip label="Remaining Months" value={`${deal.remaining_months} months`} />
                        {deal.remaining_period_price != null && <InfoChip label="Remaining Period Net Amount" value={fmtCurrency(deal.remaining_period_price)} />}
                      </div>
                    )}

                    {deal.notes && (
                      <div className="text-xs text-[var(--t3)] bg-[var(--bg3)] rounded-[8px] px-3 py-2 border border-[var(--brd)]">
                        {deal.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddDealModal
          accountName={account.name}
          defaultPartnerName={account.partner_name}
          defaultCurrency={account.currency}
          defaultPaymentTerms={account.payment_terms}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchDeals() }}
        />
      )}
      {editingDeal && (
        <AddDealModal
          accountName={account.name}
          defaultPartnerName={account.partner_name}
          defaultCurrency={account.currency}
          defaultPaymentTerms={account.payment_terms}
          initialData={editingDeal}
          onClose={() => setEditingDeal(null)}
          onSaved={() => { setEditingDeal(null); fetchDeals() }}
        />
      )}
    </>
  )
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--brd)' }}>
      <div className="text-[9px] uppercase tracking-[0.5px] text-[var(--t4)] mb-0.5">{label}</div>
      <div className="text-xs font-semibold text-[var(--t2)] truncate">{value}</div>
    </div>
  )
}
