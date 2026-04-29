import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Account } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Trash2 } from 'lucide-react'
import { fmtCurrency, daysUntil, tierVariant } from '@/lib/utils'
import { api } from '@/lib/api'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'renewal', label: 'Renewal' },
]

const COLS = [
  { key: 'name', label: 'Account' },
  { key: 'arr', label: 'ARR' },
  { key: 'renewal', label: 'Renewal' },
  { key: 'tickets', label: 'Tickets' },
]

interface Props {
  accounts: Account[]
  filter: string
  search: string
  sort: string
  order: 'asc' | 'desc'
  onFilter: (v: string) => void
  onSearch: (v: string) => void
  onSort: (col: string) => void
  onDeleted?: () => void
}

export default function AccountTable({ accounts, filter, search, sort, order, onFilter, onSearch, onSort, onDeleted }: Props) {
  const navigate = useNavigate()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (confirmId !== id) { setConfirmId(id); return }
    await api.accounts.delete(id)
    setConfirmId(null)
    onDeleted?.()
  }

  function sortArrow(col: string) {
    if (sort !== col) return <span className="opacity-20 text-[9px] ml-1">↕</span>
    return <span className="text-[var(--blue)] text-[9px] ml-1">{order === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-[var(--bg3)] border border-[var(--brd)] rounded-[10px] p-1">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`px-4 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                filter === f.value
                  ? 'bg-[var(--blue)] text-white shadow-sm'
                  : 'text-[var(--t3)] hover:text-[var(--t1)] hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--t4)]" />
          <Input
            placeholder="Search accounts, sector, CSM..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="pl-8 w-72"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg2)] border border-[var(--brd)] rounded-[14px] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg3)]">
              {COLS.map(c => (
                <th
                  key={c.key}
                  onClick={() => onSort(c.key)}
                  className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.9px] text-[var(--t4)] border-b border-[var(--brd)] cursor-pointer hover:text-[var(--t2)] whitespace-nowrap select-none transition-colors"
                >
                  {c.label}{sortArrow(c.key)}
                </th>
              ))}
              <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.9px] text-[var(--t4)] border-b border-[var(--brd)] whitespace-nowrap">CSM</th>
              <th className="border-b border-[var(--brd)] w-10" />
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-16 text-[var(--t4)]">No accounts found</td>
              </tr>
            )}
            {accounts.map(a => {
              const days = daysUntil(a.renewal_date)
              return (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/accounts/${a.id}`)}
                  className="cursor-pointer hover:bg-[var(--bg3)] transition-colors group"
                >
                  <td className="px-0 py-0">
                    <div className="flex items-center gap-3.5 px-5 py-4">
                      <div
                        className="w-1 h-10 rounded-full flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: a.color }}
                      />
                      <div
                        className="w-9 h-9 rounded-[8px] flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                        style={{ backgroundColor: a.color }}
                      >
                        {a.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--t1)] text-sm leading-tight">{a.name}</div>
                        <div className="text-[11px] text-[var(--t4)] mt-0.5">{a.sector}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-sm font-semibold text-[var(--t1)]">{fmtCurrency(a.arr)}</span>
                  </td>
                  <td className="px-5 py-4">
                    {days === null ? (
                      <span className="text-[var(--t4)] text-xs">—</span>
                    ) : days < 0 ? (
                      <Badge variant="red" dot>Expired</Badge>
                    ) : (
                      <Badge variant={days <= 30 ? 'red' : days <= 90 ? 'amber' : 'green'} dot>
                        {days}d
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {a.open_tickets > 0 ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        a.open_tickets >= 3
                          ? 'bg-[var(--red-bg)] text-[var(--red)]'
                          : 'bg-[var(--amber-bg)] text-[var(--amber)]'
                      }`}>{a.open_tickets}</span>
                    ) : (
                      <span className="text-[var(--t4)] text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={tierVariant(a.tier)}>{a.tier}</Badge>
                      <span className="text-xs text-[var(--t3)]">{a.csm}</span>
                    </div>
                  </td>
                  <td className="pr-3 py-4" onClick={e => e.stopPropagation()}>
                    {confirmId === a.id ? (
                      <button
                        onClick={e => handleDelete(e, a.id)}
                        className="text-[9px] font-bold text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/30 rounded-lg px-2 py-1 hover:bg-[var(--red)]/20 transition-colors whitespace-nowrap"
                      >
                        Confirm?
                      </button>
                    ) : (
                      <button
                        onClick={e => handleDelete(e, a.id)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--t4)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-[var(--t4)] text-right pr-1">{accounts.length} accounts</div>
    </div>
  )
}
