import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { Sale } from '@/types'
import AddSaleModal from '@/components/AddSaleModal'
import { fmtDate } from '@/lib/utils'

const LIMIT = 40

const LICENSE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'yeni', label: 'New License' },
  { value: 'ek', label: 'Add-on License' },
]

export default function SalesPage() {
  const navigate = useNavigate()
  const [sales, setSales] = useState<Sale[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [lisansTuru, setLisansTuru] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editSale, setEditSale] = useState<Sale | null>(null)

  const fetchSales = useCallback(() => {
    setLoading(true)
    api.sales.list({ search, page, limit: LIMIT, lisans_turu: lisansTuru })
      .then(d => { setSales(d.sales); setTotal(d.total) })
      .catch(() => toast.error('Failed to load sales'))
      .finally(() => setLoading(false))
  }, [search, page, lisansTuru])

  useEffect(() => { fetchSales() }, [fetchSales])

  function handleSearch(v: string) { setSearch(v); setPage(1) }
  function handleFilter(v: string) { setLisansTuru(v); setPage(1) }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"?`)) return
    try {
      await api.sales.delete(id)
      toast.success('Sale deleted')
      fetchSales()
    } catch {
      toast.error('Failed to delete sale')
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--t1)]">Sales</h1>
            <p className="text-xs text-[var(--t4)] mt-0.5">{total} records total</p>
          </div>
          <button
            onClick={() => { setEditSale(null); setShowModal(true) }}
            className="px-3 py-1.5 text-xs font-semibold rounded-[9px] text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #059669, #0ea5e9)', boxShadow: '0 2px 12px rgba(5,150,105,0.3)' }}
          >
            + New Sale
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by company name…"
            className="h-8 px-3 text-xs rounded-[9px] text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--blue)] transition-colors w-56"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
          />
          <div className="flex items-center gap-1 p-0.5 rounded-[10px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}>
            {LICENSE_FILTERS.map(f => {
              const active = lisansTuru === f.value
              return (
                <button
                  key={f.value}
                  onClick={() => handleFilter(f.value)}
                  className="px-3 py-1 rounded-[8px] text-xs font-semibold transition-all duration-150"
                  style={active ? {
                    background: 'rgba(5,150,105,0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(5,150,105,0.35)',
                  } : { color: 'var(--t3)', border: '1px solid transparent' }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-sm text-[var(--t4)]">Loading…</div>
        ) : sales.length === 0 ? (
          <div className="text-center py-20 text-[var(--t4)]">
            <div className="text-3xl mb-2 opacity-30">◈</div>
            <div className="text-sm">No sales records yet</div>
          </div>
        ) : (
          <div className="rounded-[14px] overflow-hidden" style={{ background: 'rgba(17,31,50,0.75)', border: '1px solid var(--brd)' }}>
            {/* Table header */}
            <div className="grid px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]"
              style={{ gridTemplateColumns: '2fr 1.2fr 100px 130px 150px 100px', borderBottom: '1px solid var(--brd)' }}>
              <div>Company</div>
              <div>Contact</div>
              <div>License</div>
              <div>Invoice Date</div>
              <div>Discounted Price</div>
              <div />
            </div>

            {sales.map((s, i) => {
              const bedel = s.lisans_turu === 'yeni' ? s.indirimli_musteri_bedeli_yeni : s.indirimli_musteri_bedeli_ek
              const isLast = i === sales.length - 1
              return (
                <div
                  key={s.id}
                  className="grid px-4 py-3 items-center transition-colors hover:bg-white/[0.025]"
                  style={{ gridTemplateColumns: '2fr 1.2fr 100px 130px 150px 100px', borderBottom: isLast ? 'none' : '1px solid var(--brd)' }}
                >
                  <div>
                    <div className="text-sm font-semibold text-[var(--t1)] truncate">{s.firma_adi}</div>
                    {s.firma_adresi && (
                      <div className="text-[11px] text-[var(--t4)] truncate mt-0.5">{s.firma_adresi.slice(0, 50)}{s.firma_adresi.length > 50 ? '…' : ''}</div>
                    )}
                  </div>
                  <div>
                    {(() => {
                      const c = s.contacts?.[0]
                      const name = c?.name || s.kontak_adi
                      const role = c?.role || s.kontak_gorevi
                      return <>
                        <div className="text-xs text-[var(--t2)] truncate">{name || '—'}</div>
                        {role && <div className="text-[11px] text-[var(--t4)] truncate">{role}</div>}
                      </>
                    })()}
                  </div>
                  <div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.5px] px-2 py-0.5 rounded-[5px]"
                      style={s.lisans_turu === 'yeni'
                        ? { background: 'rgba(5,150,105,0.15)', color: '#34d399', border: '1px solid rgba(5,150,105,0.3)' }
                        : { background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.25)' }}
                    >
                      {s.lisans_turu === 'yeni' ? 'New' : 'Add-on'}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[var(--t3)]">
                    {s.fatura_tarihi ? fmtDate(s.fatura_tarihi) : '—'}
                  </div>
                  <div className="text-sm font-mono font-semibold text-[var(--t1)]">
                    {bedel || '—'}
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    {s.subscription_ids && s.subscription_ids.length > 0 && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-[5px]"
                        style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' }}
                        title={`${s.subscription_ids.length} subscription(s)`}
                      >{s.subscription_ids.length} sub</span>
                    )}
                    {s.account_id && (
                      <button
                        onClick={() => navigate(`/accounts/${s.account_id}`)}
                        className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-colors text-xs"
                        style={{ color: '#38bdf8' }}
                        title="Go to Account"
                      >⇗</button>
                    )}
                    <button
                      onClick={() => { setEditSale(s); setShowModal(true) }}
                      className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-white/[0.07] transition-colors text-xs"
                      title="Edit"
                    >✎</button>
                    <button
                      onClick={() => handleDelete(s.id, s.firma_adi)}
                      className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[var(--t4)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors text-xs"
                      title="Delete"
                    >✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-[8px] text-[var(--t3)] hover:text-[var(--t1)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--brd)' }}
            >Previous</button>
            <span className="text-xs text-[var(--t4)] font-mono tabular-nums">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs rounded-[8px] text-[var(--t3)] hover:text-[var(--t1)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--brd)' }}
            >Next</button>
          </div>
        )}
      </div>

      {showModal && (
        <AddSaleModal
          initialData={editSale ?? undefined}
          onClose={() => { setShowModal(false); setEditSale(null) }}
          onSaved={() => { setShowModal(false); setEditSale(null); fetchSales() }}
        />
      )}
    </Layout>
  )
}
