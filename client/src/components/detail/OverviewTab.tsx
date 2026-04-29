import type { AccountDetail } from '@/types'
import { fmtCurrency, fmtDate, daysUntil, pctElapsed, licenseModelVariant } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Users, CalendarClock, Ticket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Props { account: AccountDetail }

function KpiCard({ label, value, sub, accent, icon: Icon }: {
  label: string; value: string; sub?: string; accent: string; icon: LucideIcon
}) {
  return (
    <div className="relative bg-[var(--bg3)] border border-[var(--brd)] rounded-[14px] p-5 overflow-hidden hover:border-[var(--brd2)] transition-all group"
      style={{ borderTop: `2px solid ${accent}` }}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}10 0%, transparent 60%)` }} />
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[var(--t4)]">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}20` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
      </div>
      <div className="text-[26px] font-bold font-mono tracking-tight leading-none" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-[11px] text-[var(--t3)] mt-1.5">{sub}</div>}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-white/[0.03] last:border-0">
      <span className="text-sm text-[var(--t3)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--t1)]">{value}</span>
    </div>
  )
}

export default function OverviewTab({ account }: Props) {
  const days = daysUntil(account.renewal_date)
  const pct = pctElapsed(account.contract_start, account.renewal_date)

  const renewalAccent = days === null ? 'var(--t4)' : days <= 30 ? 'var(--red)' : days <= 90 ? 'var(--amber)' : 'var(--green)'
  const ticketAccent = account.open_tickets >= 3 ? 'var(--red)' : account.open_tickets > 0 ? 'var(--amber)' : 'var(--green)'

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Annual Recurring Revenue" value={fmtCurrency(account.arr)} accent="var(--green)" icon={DollarSign} />
        <KpiCard label="Total Licenses" value={account.total_licenses > 0 ? String(account.total_licenses) : '—'}
          sub="licensed users" accent="var(--blue)" icon={Users} />
        <KpiCard label="Renewal" value={days !== null ? `${days}d` : '—'}
          sub={fmtDate(account.renewal_date)} accent={renewalAccent} icon={CalendarClock} />
        <KpiCard label="Open Tickets" value={String(account.open_tickets)} accent={ticketAccent} icon={Ticket} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Contract */}
        <div className="bg-[var(--bg3)] border border-[var(--brd)] rounded-[14px] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.6px] text-[var(--t4)] mb-4 flex items-center gap-2">
            <div className="w-1 h-3 rounded-full bg-[var(--blue)]" />
            Contract
          </div>
          {account.contract_start ? (
            <>
              <div className="h-5 bg-white/[0.04] rounded-lg relative overflow-hidden mb-2">
                <div className="h-full rounded-lg absolute left-0 top-0 transition-all duration-700"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--blue), var(--cyan))' }} />
              </div>
              <div className="flex justify-between text-[11px] text-[var(--t4)] font-mono mb-3">
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
            <div className="flex justify-between items-center py-2.5 border-b border-white/[0.03] last:border-0">
              <span className="text-sm text-[var(--t3)]">License Model</span>
              <Badge variant={licenseModelVariant(account.license_model)}>{account.license_model}</Badge>
            </div>
          )}
        </div>

        {/* Account info */}
        <div className="bg-[var(--bg3)] border border-[var(--brd)] rounded-[14px] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.6px] text-[var(--t4)] mb-4 flex items-center gap-2">
            <div className="w-1 h-3 rounded-full bg-[var(--purple)]" />
            Account Info
          </div>
          <InfoRow label="Sector" value={account.sector || '—'} />
          <InfoRow label="NPS" value={account.nps !== null ? String(account.nps) : '—'} />
          <InfoRow label="SLA Compliance" value={account.sla_compliance !== null ? `${account.sla_compliance}%` : '—'} />
          <InfoRow label="Avg Resolution" value={account.avg_resolution || '—'} />
          <InfoRow label="CSM" value={account.csm || '—'} />
        </div>

        {/* Key contacts */}
        <div className="bg-[var(--bg3)] border border-[var(--brd)] rounded-[14px] p-5 col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.6px] text-[var(--t4)] mb-4 flex items-center gap-2">
            <div className="w-1 h-3 rounded-full bg-[var(--cyan)]" />
            Key Contacts
          </div>
          {account.contacts.length === 0 ? (
            <p className="text-sm text-[var(--t4)]">No contacts</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {account.contacts.map(c => (
                <div key={c.id} className="flex items-center gap-3 bg-white/[0.025] border border-[var(--brd)] rounded-[10px] p-3 hover:border-[var(--brd2)] transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[var(--purple-bg)] flex items-center justify-center text-xs font-bold text-[var(--purple)] flex-shrink-0">
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
