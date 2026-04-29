import type { AccountSummaryStats } from '@/types'
import { fmtCurrency } from '@/lib/utils'
import { Users, TrendingUp, CalendarClock, TicketX } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Props { stats: AccountSummaryStats }

function Card({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string; sub?: string
  icon: LucideIcon; accent: string
}) {
  return (
    <div
      className="relative bg-[var(--bg3)] border border-[var(--brd)] rounded-[14px] p-5 overflow-hidden hover:border-[var(--brd2)] transition-all hover:-translate-y-0.5 group"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 0% 50%, ${accent}12 0%, transparent 60%)` }}
      />
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.9px] text-[var(--t4)]">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${accent}20` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
      </div>
      <div className="text-[26px] font-bold font-mono tracking-tight leading-none mb-1">{value}</div>
      {sub && <div className="text-[11px] text-[var(--t4)] mt-1.5">{sub}</div>}
    </div>
  )
}

export default function SummaryCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      <Card label="Total Accounts" value={String(stats.total_accounts)}
        sub={`${stats.active_accounts} active · ${stats.prospect_accounts} prospect`}
        icon={Users} accent="var(--blue)" />
      <Card label="Total ARR" value={fmtCurrency(stats.total_arr)}
        sub={`${stats.total_licenses} licenses`}
        icon={TrendingUp} accent="var(--green)" />
      <Card label="Upcoming Renewals" value={String(stats.upcoming_renewals)}
        sub="next 120 days"
        icon={CalendarClock} accent="var(--amber)" />
      <Card label="Open Tickets" value={String(stats.total_open_tickets)}
        sub="across all accounts"
        icon={TicketX} accent="var(--red)" />
    </div>
  )
}
