import { useState, useEffect, useCallback } from 'react'
import Layout from '@/components/Layout'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { AuditLog } from '@/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

const ACTION_META: Record<string, { label: string; hex: string }> = {
  create: { label: 'Created', hex: '#2ed896' },
  update: { label: 'Updated', hex: '#5b9eff' },
  delete: { label: 'Deleted', hex: '#f26464' },
}

const ENTITY_LABELS: Record<string, string> = {
  account:          'Account',
  contact:          'Contact',
  subscription:     'Subscription',
  deal:             'Deal',
  payment_schedule: 'Payment Schedule',
}

const ACTION_FILTERS = [
  { value: '', label: 'All' },
  { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
]

const ENTITY_FILTERS = [
  { value: '', label: 'All Types' },
  { value: 'account', label: 'Account' },
  { value: 'contact', label: 'Contact' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'deal', label: 'Deal' },
  { value: 'payment_schedule', label: 'Payment Schedule' },
]

function formatTs(iso: string) {
  const d = new Date(iso)
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

function displayName(email: string) {
  return email.split('@')[0].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

function LogEntry({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)
  const meta = ACTION_META[log.action] ?? { label: log.action, hex: '#888' }
  const hasChanges = log.action === 'update' && log.changes && Object.keys(log.changes).length > 0

  return (
    <div
      className="rounded-[14px] overflow-hidden transition-all"
      style={{ background: 'rgba(17,31,50,0.75)', border: '1px solid var(--brd)', backdropFilter: 'blur(8px)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* colored left bar */}
        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: meta.hex }} />

        {/* action badge */}
        <div
          className="text-[10px] font-bold uppercase tracking-[0.7px] px-2 py-0.5 rounded-[5px] flex-shrink-0"
          style={{ background: `${meta.hex}20`, color: meta.hex, border: `1px solid ${meta.hex}35` }}
        >
          {meta.label}
        </div>

        {/* entity type badge */}
        <div
          className="text-[10px] font-medium px-2 py-0.5 rounded-[5px] flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--t3)', border: '1px solid var(--brd)' }}
        >
          {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
        </div>

        {/* entity name */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--t1)] truncate">{log.entity_name}</div>
          <div className="text-[11px] text-[var(--t4)] mt-0.5">
            {displayName(log.user_email)}
            <span className="mx-1.5 opacity-40">·</span>
            {formatTs(log.timestamp)}
          </div>
        </div>

        {/* expand button (only for updates with changes) */}
        {hasChanges && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[10px] text-[var(--t4)] hover:text-[var(--t1)] transition-colors flex-shrink-0 px-1"
          >
            <span className="hidden sm:inline">{Object.keys(log.changes!).length} field{Object.keys(log.changes!).length !== 1 ? 's' : ''}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* changes detail */}
      {hasChanges && expanded && (
        <div
          className="border-t border-[var(--brd)] px-4 py-3"
          style={{ background: 'rgba(0,0,0,0.18)' }}
        >
          <div className="space-y-1.5">
            {Object.entries(log.changes!).map(([field, { from, to }]) => (
              <div key={field} className="flex items-start gap-2 text-xs">
                <span className="text-[var(--t4)] min-w-[120px] flex-shrink-0 pt-0.5">{field}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'rgba(242,100,100,0.12)', color: '#f26464', border: '1px solid rgba(242,100,100,0.2)', textDecoration: 'line-through', opacity: 0.8 }}
                  >
                    {from || '—'}
                  </span>
                  <span className="text-[var(--t4)]">→</span>
                  <span
                    className="px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'rgba(46,216,150,0.12)', color: '#2ed896', border: '1px solid rgba(46,216,150,0.2)' }}
                  >
                    {to || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const LIMIT = 40

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(() => {
    setLoading(true)
    api.auditLogs.list({ page, limit: LIMIT, action: actionFilter, entityType: entityFilter })
      .then(d => { setLogs(d.logs); setTotal(d.total) })
      .catch(() => toast.error('Failed to load activity log'))
      .finally(() => setLoading(false))
  }, [page, actionFilter, entityFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  function changeFilter(newAction: string, newEntity: string) {
    setPage(1)
    setActionFilter(newAction)
    setEntityFilter(newEntity)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <Layout>
      <div className="space-y-4">
        {/* header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--t1)]">Activity Log</h1>
            <p className="text-xs text-[var(--t4)] mt-0.5">{total} records total</p>
          </div>
          <button
            onClick={fetchLogs}
            className="text-xs text-[var(--t4)] hover:text-[var(--t1)] transition-colors px-2 py-1 rounded hover:bg-white/5"
          >
            Refresh
          </button>
        </div>

        {/* filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* action pills */}
          <div className="flex items-center gap-1 p-0.5 rounded-[10px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}>
            {ACTION_FILTERS.map(f => {
              const active = actionFilter === f.value
              const hex = f.value ? (ACTION_META[f.value]?.hex ?? '#888') : null
              return (
                <button
                  key={f.value}
                  onClick={() => changeFilter(f.value, entityFilter)}
                  className="px-3 py-1 rounded-[8px] text-xs font-semibold transition-all duration-150"
                  style={active ? {
                    background: hex ? `${hex}22` : 'rgba(91,158,255,0.15)',
                    color: hex ?? 'var(--blue)',
                    border: `1px solid ${hex ? hex + '40' : 'rgba(91,158,255,0.3)'}`,
                  } : {
                    color: 'var(--t3)',
                    border: '1px solid transparent',
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* entity type select */}
          <select
            value={entityFilter}
            onChange={e => changeFilter(actionFilter, e.target.value)}
            className="text-xs px-3 py-1.5 rounded-[8px] text-[var(--t2)] outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--brd)' }}
          >
            {ENTITY_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* log list */}
        {loading ? (
          <div className="text-center py-16 text-sm text-[var(--t4)]">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-[var(--t4)]">
            <div className="text-3xl mb-2 opacity-30">📋</div>
            <div className="text-sm">No activity yet</div>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => <LogEntry key={log.id} log={log} />)}
          </div>
        )}

        {/* pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-[8px] text-[var(--t3)] hover:text-[var(--t1)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--brd)' }}
            >
              Previous
            </button>
            <span className="text-xs text-[var(--t4)] font-mono tabular-nums">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs rounded-[8px] text-[var(--t3)] hover:text-[var(--t1)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--brd)' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
