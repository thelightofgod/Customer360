import type { AccountSummaryStats } from '@/types'
import { fmtCurrency } from '@/lib/utils'
import { Users, TrendingUp, CalendarClock, TicketX } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Props { stats: AccountSummaryStats }

function Card({
  label, value, sub, icon: Icon, hex,
}: {
  label: string; value: string; sub?: string
  icon: LucideIcon; hex: string
}) {
  return (
    <div
      className="relative rounded-[18px] p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 group cursor-default"
      style={{
        background: `linear-gradient(145deg, ${hex}28 0%, var(--bg3) 60%)`,
        border: `1px solid ${hex}35`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.25), 0 0 48px ${hex}10`,
      }}
    >
      <div
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full pointer-events-none opacity-30 group-hover:opacity-45 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, ${hex} 0%, transparent 68%)` }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none opacity-50"
        style={{ background: `linear-gradient(90deg, transparent, ${hex}80, transparent)` }}
      />

      <div className="relative flex items-start justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-[1.2px] text-[var(--t4)]">{label}</span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{
            background: `${hex}25`,
            boxShadow: `0 4px 16px ${hex}40`,
            border: `1px solid ${hex}40`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: hex }} />
        </div>
      </div>

      <div
        className="relative text-[34px] font-bold font-mono tracking-tight leading-none mb-2"
        style={{ color: hex, textShadow: `0 0 30px ${hex}60` }}
      >
        {value}
      </div>
      {sub && <div className="relative text-[11px] text-[var(--t4)] font-medium">{sub}</div>}
    </div>
  )
}

export default function SummaryCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
      <Card label="Total Accounts" value={String(stats.total_accounts)}
        sub={`${stats.active_accounts} active · ${stats.prospect_accounts} prospect`}
        icon={Users} hex="#5b9eff" />
      <Card label="Total ARR" value={fmtCurrency(stats.total_arr)}
        sub={`${stats.total_licenses} licenses`}
        icon={TrendingUp} hex="#2ed896" />
      <Card label="Upcoming Renewals" value={String(stats.upcoming_renewals)}
        sub="next 120 days"
        icon={CalendarClock} hex="#f7aa28" />
      <Card label="Open Tickets" value={String(stats.total_open_tickets)}
        sub="across all accounts"
        icon={TicketX} hex="#f26464" />
    </div>
  )
}
