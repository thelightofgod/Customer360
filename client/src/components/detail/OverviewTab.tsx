import type { AccountDetail } from '@/types'
import { fmtCurrency, fmtDate, daysUntil, pctElapsed, licenseModelVariant } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Users, CalendarClock, Ticket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Props { account: AccountDetail }

function KpiCard({ label, value, sub, hex, icon: Icon }: {
  label: string; value: string; sub?: string; hex: string; icon: LucideIcon
}) {
  return (
    <div
      className="relative rounded-[16px] p-5 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 group cursor-default"
      style={{
        background: `linear-gradient(145deg, ${hex}28 0%, var(--bg3) 60%)`,
        border: `1px solid ${hex}35`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.25), 0 0 40px ${hex}10`,
      }}
    >
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none opacity-25 group-hover:opacity-35 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, ${hex} 0%, transparent 70%)` }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none opacity-40"
        style={{ background: `linear-gradient(90deg, transparent, ${hex}80, transparent)` }}
      />
      <div className="relative flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[1.1px] text-[var(--t4)]">{label}</span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${hex}25`, border: `1px solid ${hex}35`, boxShadow: `0 3px 10px ${hex}30` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: hex }} />
        </div>
      </div>
      <div
        className="relative text-[28px] font-bold font-mono tracking-tight leading-none"
        style={{ color: hex, textShadow: `0 0 24px ${hex}55` }}
      >
        {value}
      </div>
      {sub && <div className="relative text-[11px] text-[var(--t4)] mt-1.5">{sub}</div>}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-sm text-[var(--t3)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--t1)]">{value}</span>
    </div>
  )
}

export default function OverviewTab({ account }: Props) {
  const days = daysUntil(account.renewal_date)
  const pct = pctElapsed(account.contract_start, account.renewal_date)

  const renewalHex = days === null ? '#3f5278' : days <= 30 ? '#f26464' : days <= 90 ? '#f7aa28' : '#2ed896'
  const ticketHex = account.open_tickets >= 3 ? '#f26464' : account.open_tickets > 0 ? '#f7aa28' : '#2ed896'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Annual Recurring Revenue" value={fmtCurrency(account.arr)} hex="#2ed896" icon={DollarSign} />
        <KpiCard label="Total Licenses" value={account.total_licenses > 0 ? String(account.total_licenses) : '—'}
          sub="licensed users" hex="#5b9eff" icon={Users} />
        <KpiCard label="Renewal" value={days !== null ? `${days}d` : '—'}
          sub={fmtDate(account.renewal_date)} hex={renewalHex} icon={CalendarClock} />
        <KpiCard label="Open Tickets" value={String(account.open_tickets)} hex={ticketHex} icon={Ticket} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-[16px] p-5"
          style={{ background: 'rgba(35, 45, 78, 0.70)', border: '1px solid var(--brd)', backdropFilter: 'blur(8px)' }}
        >
          <div className="text-xs font-bold uppercase tracking-[0.8px] text-[var(--t4)] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(180deg, #5b9eff, #3a7ff5)' }} />
            Contract
          </div>
          {account.contract_start ? (
            <>
              <div className="h-2 rounded-full relative overflow-hidden mb-2.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div
                  className="h-full rounded-full absolute left-0 top-0 transition-all duration-700"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #5b9eff, #1ad0e8)' }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[var(--t4)] font-mono mb-4">
                <span>{fmtDate(account.contract_start)}</span>
                <span>{fmtDate(account.renewal_date)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--t4)] mb-3">No active contract</p>
          )}
          <InfoRow label="Edition" value={account.edition || '—'} />
          <InfoRow label="Contract Value" value={fmtCurrency(account.total_contract_value)} />
          {account.license_model && (
            <div className="flex justify-between items-center py-2.5 border-b border-white/[0.04] last:border-0">
              <span className="text-sm text-[var(--t3)]">License Model</span>
              <Badge variant={licenseModelVariant(account.license_model)}>{account.license_model}</Badge>
            </div>
          )}
        </div>

        <div
          className="rounded-[16px] p-5"
          style={{ background: 'rgba(35, 45, 78, 0.70)', border: '1px solid var(--brd)', backdropFilter: 'blur(8px)' }}
        >
          <div className="text-xs font-bold uppercase tracking-[0.8px] text-[var(--t4)] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(180deg, #a07cf0, #7c50e8)' }} />
            Account Info
          </div>
          <InfoRow label="Sector" value={account.sector || '—'} />
          <InfoRow label="NPS" value={account.nps !== null ? String(account.nps) : '—'} />
          <InfoRow label="SLA Compliance" value={account.sla_compliance !== null ? `${account.sla_compliance}%` : '—'} />
          <InfoRow label="Avg Resolution" value={account.avg_resolution || '—'} />
          <InfoRow label="CSM" value={account.csm || '—'} />
        </div>

        <div
          className="rounded-[16px] p-5 col-span-2"
          style={{ background: 'rgba(35, 45, 78, 0.70)', border: '1px solid var(--brd)', backdropFilter: 'blur(8px)' }}
        >
          <div className="text-xs font-bold uppercase tracking-[0.8px] text-[var(--t4)] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-3.5 rounded-full" style={{ background: 'linear-gradient(180deg, #1ad0e8, #14a8bc)' }} />
            Key Contacts
          </div>
          {account.contacts.length === 0 ? (
            <p className="text-sm text-[var(--t4)]">No contacts</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {account.contacts.map(c => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-[12px] p-3 transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brd2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brd)'}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#a07cf018', color: '#a07cf0', border: '1px solid #a07cf030' }}
                  >
                    {c.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--t1)] truncate">{c.name}</div>
                    <div className="text-[11px] text-[var(--t4)] truncate">{c.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
