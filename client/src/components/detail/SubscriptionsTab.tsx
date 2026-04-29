import type { AccountDetail } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { fmtCurrency, categoryVariant, groupIcon } from '@/lib/utils'

interface Props { account: AccountDetail; onAdd?: () => void }

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export default function SubscriptionsTab({ account, onAdd }: Props) {
  const grouped = groupBy(account.subscriptions, s => s.product_group)
  const groups = Object.keys(grouped).sort()
  const total = account.subscriptions.reduce((s, r) => s + r.total_price, 0)

  if (account.subscriptions.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--t4)]">
        <div className="text-3xl mb-2">📦</div>
        <div className="text-sm font-semibold text-[var(--t3)] mb-3">No active subscriptions</div>
        {onAdd && <Button onClick={onAdd}><Plus className="w-3.5 h-3.5" /> Add Subscription</Button>}
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg3)] border border-[var(--brd)] rounded-[14px] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_110px_90px_100px_110px] gap-1 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)] bg-black/20 border-b border-[var(--brd)]">
        <span>Product</span>
        <span className="text-center">Category</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Unit Price</span>
        <span className="text-right">Total</span>
      </div>

      {groups.map(group => (
        <div key={group}>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-black/20 border-b border-[var(--brd)] text-[11px] font-semibold uppercase tracking-[0.7px] text-[var(--t4)]">
            <span>{groupIcon(group)}</span>
            <span>{group}</span>
          </div>
          {grouped[group].map(s => (
            <div key={s.id} className="grid grid-cols-[1fr_110px_90px_100px_110px] gap-1 items-center px-4 py-3 border-b border-white/[0.02] hover:bg-white/[0.012] transition-colors last:border-0 text-sm">
              <span className="font-medium text-[var(--t1)]">{s.product_name}</span>
              <span className="text-center">
                <Badge variant={categoryVariant(s.category)} className="text-[10px] px-1.5 py-0 rounded-[4px]">
                  {s.category}
                </Badge>
              </span>
              <span className="font-mono font-semibold text-center text-[var(--t1)]">{s.quantity} <span className="text-[10px] text-[var(--t4)] font-normal">{s.unit_label}</span></span>
              <span className="font-mono text-right text-[var(--t2)]">{fmtCurrency(s.unit_price)}</span>
              <span className="font-mono font-semibold text-right text-[var(--t1)]">{fmtCurrency(s.total_price)}</span>
            </div>
          ))}
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
  )
}
