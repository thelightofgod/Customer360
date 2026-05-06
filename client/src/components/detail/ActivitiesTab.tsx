import type { AccountDetail } from '@/types'
import { fmtDate } from '@/lib/utils'

interface Props { account: AccountDetail }

export default function ActivitiesTab({ account }: Props) {
  if (account.activities.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--t4)]">
        <div className="text-3xl mb-2">📋</div>
        <div className="text-sm font-semibold text-[var(--t3)]">No activities</div>
      </div>
    )
  }

  return (
    <div
      className="rounded-[16px] px-4 py-1"
      style={{ background: 'rgba(35, 45, 78, 0.70)', border: '1px solid var(--brd)' }}
    >
      {account.activities.map((act, i) => (
        <div key={act.id} className={`flex gap-3 py-3.5 ${i < account.activities.length - 1 ? 'border-b border-white/[0.025]' : ''}`}>
          <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: act.color }} />
          <div>
            <div className="text-sm text-[var(--t2)] leading-relaxed">{act.description}</div>
            <div className="text-[11px] text-[var(--t4)] mt-1 font-mono">{fmtDate(act.activity_date)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
