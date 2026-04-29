import type { AccountDetail } from '@/types'
import { fmtDate } from '@/lib/utils'

interface Props { account: AccountDetail }

function resolveColor(color: string): string {
  const map: Record<string, string> = {
    'var(--blue)': 'var(--blue)',
    'var(--green)': 'var(--green)',
    'var(--amber)': 'var(--amber)',
    'var(--red)': 'var(--red)',
    'var(--purple)': 'var(--purple)',
    'var(--cyan)': 'var(--cyan)',
  }
  return map[color] ?? 'var(--blue)'
}

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
    <div className="bg-[var(--bg3)] border border-[var(--brd)] rounded-[14px] px-4 py-1">
      {account.activities.map((act, i) => (
        <div key={act.id} className={`flex gap-3 py-3.5 ${i < account.activities.length - 1 ? 'border-b border-white/[0.025]' : ''}`}>
          <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: resolveColor(act.color) }} />
          <div>
            <div className="text-sm text-[var(--t2)] leading-relaxed">{act.description}</div>
            <div className="text-[11px] text-[var(--t4)] mt-1 font-mono">{fmtDate(act.activity_date)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
