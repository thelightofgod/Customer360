import type { AccountDetail } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface Props { account: AccountDetail; onAdd?: () => void }

const TYPE_VARIANTS: Record<string, 'purple' | 'blue' | 'green' | 'muted'> = {
  sponsor: 'purple',
  technical: 'blue',
  business: 'green',
  admin: 'muted',
}

export default function ContactsTab({ account, onAdd }: Props) {
  if (account.contacts.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--t4)]">
        <div className="text-3xl mb-2">👥</div>
        <div className="text-sm font-semibold text-[var(--t3)] mb-3">No contacts</div>
        {onAdd && <Button onClick={onAdd}><Plus className="w-3.5 h-3.5" /> Add Contact</Button>}
      </div>
    )
  }

  return (
    <div>
      {onAdd && (
        <div className="flex justify-end mb-3">
          <Button onClick={onAdd}><Plus className="w-3.5 h-3.5" /> Add Contact</Button>
        </div>
      )}
    <div className="grid grid-cols-2 gap-3">
      {account.contacts.map(c => (
        <div key={c.id} className="bg-[var(--bg3)] border border-[var(--brd)] rounded-[14px] p-4 hover:border-[var(--brd2)] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[var(--purple-bg)] flex items-center justify-center text-sm font-bold text-[var(--purple)] flex-shrink-0">
              {c.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[var(--t1)]">{c.name}</div>
              <div className="text-xs text-[var(--t3)] mt-0.5">{c.role}</div>
            </div>
            <Badge variant={TYPE_VARIANTS[c.contact_type] ?? 'muted'} className="capitalize">
              {c.contact_type}
            </Badge>
          </div>
          {(c.email || c.phone) && (
            <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-1">
              {c.email && <div className="text-xs text-[var(--t4)]">{c.email}</div>}
              {c.phone && <div className="text-xs text-[var(--t4)]">{c.phone}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
    </div>
  )
}
