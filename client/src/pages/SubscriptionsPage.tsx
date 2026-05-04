import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import AddSubscriptionModal from '@/components/AddSubscriptionModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { SubscriptionDetail } from '@/types'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { fmtCurrency, categoryVariant } from '@/lib/utils'

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<SubscriptionDetail[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingSub, setEditingSub] = useState<SubscriptionDetail | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  function fetchSubs() {
    setLoading(true)
    api.subscriptions.list().then(d => setSubs(d.subscriptions)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchSubs() }, [])

  async function handleDelete(id: string) {
    await api.subscriptions.delete(id)
    setDeletingId(null)
    fetchSubs()
  }

  const filtered = search
    ? subs.filter(s =>
        (s.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.account_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.category || '').toLowerCase().includes(search.toLowerCase())
      )
    : subs

  const totalValue = filtered.reduce((sum, s) => sum + s.total_price, 0)

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--t1)]">Subscriptions</h1>
          <p className="text-sm text-[var(--t4)] mt-0.5">{subs.length} subscriptions · {fmtCurrency(totalValue)} total</p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> New Subscription
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--t4)]" />
        <Input
          placeholder="Search by product, account, category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 max-w-sm"
        />
      </div>

      <div className={`bg-[var(--bg2)] border border-[var(--brd)] rounded-[14px] overflow-hidden ${loading ? 'opacity-60' : ''} transition-opacity`}>
        <div className="grid grid-cols-[1.5fr_1fr_120px_90px_100px_110px_72px] gap-1 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)] bg-[var(--bg3)] border-b border-[var(--brd)]">
          <span>Product</span>
          <span>Account</span>
          <span className="text-center">Category</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Unit Price</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16 text-[var(--t4)]">No subscriptions found</div>
        )}

        {filtered.map(s => (
          <div key={s.id} className="grid grid-cols-[1.5fr_1fr_120px_90px_100px_110px_72px] gap-1 items-center px-5 py-3 border-b border-white/[0.02] hover:bg-[var(--bg3)] transition-colors last:border-0 text-sm">
            <div>
              <div className="font-medium text-[var(--t1)]">{s.product_name}</div>
              <div className="text-[11px] text-[var(--t4)]">{s.product_group}</div>
            </div>
            <span className="text-xs text-[var(--t3)]">{s.account_name}</span>
            <span className="text-center">
              <Badge variant={categoryVariant(s.category)} className="text-[10px] px-1.5 py-0 rounded-[4px]">
                {s.category}
              </Badge>
            </span>
            <span className="font-mono font-semibold text-center text-[var(--t1)]">
              {s.quantity} <span className="text-[10px] text-[var(--t4)] font-normal">{s.unit_label}</span>
            </span>
            <span className="font-mono text-right text-[var(--t2)]">{fmtCurrency(s.unit_price)}</span>
            <span className="font-mono font-semibold text-right text-[var(--t1)]">{fmtCurrency(s.total_price)}</span>
            <div className="flex items-center justify-end gap-1">
              {deletingId === s.id ? (
                <>
                  <button onClick={() => handleDelete(s.id)} className="text-[10px] text-[var(--red)] hover:underline font-medium">Del</button>
                  <button onClick={() => setDeletingId(null)} className="text-[10px] text-[var(--t4)] hover:underline ml-1">✕</button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingSub(s)}
                    className="w-6 h-6 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--bg3)] transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setDeletingId(s.id)}
                    className="w-6 h-6 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {filtered.length > 0 && (
          <div className="flex justify-between items-center px-5 py-3.5 bg-[var(--bg3)] border-t border-[var(--brd)]">
            <span className="text-xs font-semibold uppercase tracking-[0.5px] text-[var(--t3)]">Total Value</span>
            <span className="text-lg font-bold font-mono text-[var(--green)]">{fmtCurrency(totalValue)}</span>
          </div>
        )}
      </div>

      {showAdd && (
        <AddSubscriptionModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); fetchSubs() }}
        />
      )}
      {editingSub && (
        <AddSubscriptionModal
          initialData={editingSub}
          onClose={() => setEditingSub(null)}
          onCreated={() => { setEditingSub(null); fetchSubs() }}
        />
      )}
    </Layout>
  )
}
