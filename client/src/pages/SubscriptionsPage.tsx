import { useEffect, useState, useRef } from 'react'
import Layout from '@/components/Layout'
import AddSubscriptionModal from '@/components/AddSubscriptionModal'
import Pagination from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { SubscriptionDetail } from '@/types'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { fmtCurrency, categoryVariant } from '@/lib/utils'

const PAGE_LIMIT = 20

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<SubscriptionDetail[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingSub, setEditingSub] = useState<SubscriptionDetail | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function fetchSubs(p = page, s = debouncedSearch) {
    setLoading(true)
    api.subscriptions.list({ search: s, page: p, limit: PAGE_LIMIT })
      .then(d => { setSubs(d.subscriptions); setTotal(d.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSubs(page, debouncedSearch) }, [page, debouncedSearch])

  function handleSearch(val: string) {
    setSearch(val)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300)
  }

  async function handleDelete(id: string) {
    try {
      await api.subscriptions.delete(id)
      setDeletingId(null)
      fetchSubs()
    } catch (e) {
      console.error('Failed to delete subscription', e)
      setDeletingId(null)
    }
  }

  const filtered = subs
  const totalValue = filtered.reduce((sum, s) => sum + s.total_price, 0)

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--t1)] tracking-tight">Subscriptions</h1>
          <p className="text-sm text-[var(--t4)] mt-0.5">
            {total} subscriptions
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> New Subscription
        </Button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--t4)]" />
        <Input
          placeholder="Search by product, account, category..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="pl-8 w-full sm:max-w-sm"
        />
      </div>

      <div
        className={`rounded-[16px] overflow-hidden transition-opacity ${loading ? 'opacity-50' : ''}`}
        style={{
          background: 'rgba(11, 21, 38, 0.75)',
          border: '1px solid var(--brd)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.30)',
        }}
      >
        <div className="overflow-x-auto">
        <div className="min-w-[720px]">
        <div
          className="grid grid-cols-[1.5fr_1fr_120px_90px_100px_110px_72px] gap-1 px-5 py-3 text-[10px] font-bold uppercase tracking-[1px] text-[var(--t4)]"
          style={{ background: 'rgba(22, 38, 56, 0.80)', borderBottom: '1px solid var(--brd)' }}
        >
          <span>Product</span>
          <span>Account</span>
          <span className="text-center">Category</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Unit Price</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        {filtered.length === 0 && !loading && (
          <div className="text-center py-20 text-[var(--t4)]">
            <div className="text-3xl mb-3 opacity-40">📦</div>
            No subscriptions found
          </div>
        )}

        {filtered.map(s => (
          <div
            key={s.id}
            className="grid grid-cols-[1.5fr_1fr_120px_90px_100px_110px_72px] gap-1 items-center px-5 py-3.5 border-b border-white/[0.025] last:border-0 text-sm transition-all duration-150"
            style={{ background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(91,158,255,0.04)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
          >
            <div>
              <div className="font-semibold text-[var(--t1)]">{s.product_name}</div>
              <div className="text-[11px] text-[var(--t4)]">{s.product_group}</div>
            </div>
            <span className="text-xs font-medium text-[var(--t3)]">{s.account_name}</span>
            <span className="text-center">
              <Badge variant={categoryVariant(s.category)} className="text-[10px] px-1.5 py-0 rounded-[4px]">
                {s.category}
              </Badge>
            </span>
            <span className="font-mono font-bold text-center text-[var(--t1)]">
              {s.quantity} <span className="text-[10px] text-[var(--t4)] font-normal">{s.unit_label}</span>
            </span>
            <span className="font-mono text-right text-[var(--t2)]">{fmtCurrency(s.unit_price)}</span>
            <span className="font-mono font-bold text-right" style={{ color: 'var(--green)' }}>{fmtCurrency(s.total_price)}</span>
            <div className="flex items-center justify-end gap-1">
              {deletingId === s.id ? (
                <>
                  <button onClick={() => handleDelete(s.id)} className="text-[10px] text-[var(--red)] hover:underline font-bold">Del</button>
                  <button onClick={() => setDeletingId(null)} className="text-[10px] text-[var(--t4)] hover:underline ml-1">✕</button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingSub(s)}
                    className="w-6 h-6 rounded flex items-center justify-center text-[var(--t4)] transition-all duration-150 hover:text-[var(--t1)]"
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setDeletingId(s.id)}
                    className="w-6 h-6 rounded flex items-center justify-center text-[var(--t4)] transition-all duration-150 hover:text-[var(--red)]"
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-bg)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        </div>
        </div>
        {filtered.length > 0 && (
          <div
            className="flex justify-between items-center px-5 py-4"
            style={{ background: 'rgba(22, 38, 56, 0.60)', borderTop: '1px solid var(--brd)' }}
          >
            <span className="text-xs font-bold uppercase tracking-[0.7px] text-[var(--t3)]">Total Value</span>
            <span
              className="text-lg font-bold font-mono"
              style={{ color: 'var(--green)', textShadow: '0 0 20px rgba(46,216,150,0.4)' }}
            >
              {fmtCurrency(totalValue)}
            </span>
          </div>
        )}
      </div>

      <Pagination page={page} total={total} limit={PAGE_LIMIT} onChange={setPage} />

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
