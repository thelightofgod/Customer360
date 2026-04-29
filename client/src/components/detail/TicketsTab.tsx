import type { AccountDetail } from '@/types'
import { Badge } from '@/components/ui/badge'
import { statusVariant, slaVariant, priorityColor, fmtDate } from '@/lib/utils'

interface Props { account: AccountDetail }

export default function TicketsTab({ account }: Props) {
  if (account.tickets.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--t4)]">
        <div className="text-3xl mb-2">✅</div>
        <div className="text-sm font-semibold text-[var(--t3)]">No tickets</div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg3)] border border-[var(--brd)] rounded-[14px] overflow-hidden">
      <div className="grid grid-cols-[90px_1fr_80px_110px_90px_100px_110px] gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)] bg-black/20 border-b border-[var(--brd)]">
        <span>Ref</span>
        <span>Subject</span>
        <span className="text-center">Priority</span>
        <span className="text-center">Status</span>
        <span className="text-center">SLA</span>
        <span>Assignee</span>
        <span>Created</span>
      </div>
      {account.tickets.map(t => (
        <div key={t.id} className="grid grid-cols-[90px_1fr_80px_110px_90px_100px_110px] gap-2 items-center px-4 py-3.5 border-b border-white/[0.02] hover:bg-white/[0.012] transition-colors last:border-0">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: priorityColor(t.priority) }} />
            <span className="font-mono text-xs text-[var(--t2)] font-semibold">{t.ticket_ref}</span>
          </div>
          <span className="text-sm text-[var(--t2)] truncate">{t.subject}</span>
          <span className="text-center">
            <span className="text-xs font-semibold" style={{ color: priorityColor(t.priority) }}>{t.priority}</span>
          </span>
          <span className="text-center">
            <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
          </span>
          <span className="text-center">
            <Badge variant={slaVariant(t.sla_status)} dot>{t.sla_status}</Badge>
          </span>
          <span className="text-xs text-[var(--t3)]">{t.assignee}</span>
          <span className="text-xs text-[var(--t4)] font-mono">{fmtDate(t.created_at)}</span>
        </div>
      ))}
    </div>
  )
}
