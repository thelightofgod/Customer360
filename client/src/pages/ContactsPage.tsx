import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import AddContactModal from '@/components/AddContactModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { Contact } from '@/types'
import { Plus, Search } from 'lucide-react'

const TYPE_VARIANTS: Record<string, 'purple' | 'blue' | 'green' | 'muted'> = {
  sponsor: 'purple', technical: 'blue', business: 'green', admin: 'muted',
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  function fetchContacts() {
    setLoading(true)
    api.contacts.list().then(d => setContacts(d.contacts)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchContacts() }, [])

  const filtered = search
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.account_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.role || '').toLowerCase().includes(search.toLowerCase())
      )
    : contacts

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--t1)]">Contacts</h1>
          <p className="text-sm text-[var(--t4)] mt-0.5">{contacts.length} contacts across all accounts</p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> New Contact
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--t4)]" />
        <Input
          placeholder="Search by name, account, role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 max-w-sm"
        />
      </div>

      <div className={`grid grid-cols-3 gap-3 ${loading ? 'opacity-60' : ''} transition-opacity`}>
        {filtered.length === 0 && !loading && (
          <div className="col-span-3 text-center py-16 text-[var(--t4)]">No contacts found</div>
        )}
        {filtered.map(c => (
          <div key={c.id} className="bg-[var(--bg3)] border border-[var(--brd)] rounded-[14px] p-4 hover:border-[var(--brd2)] transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-[var(--purple-bg)] flex items-center justify-center text-sm font-bold text-[var(--purple)] flex-shrink-0">
                {c.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[var(--t1)] truncate">{c.name}</div>
                <div className="text-xs text-[var(--t3)] mt-0.5 truncate">{c.role}</div>
              </div>
              <Badge variant={TYPE_VARIANTS[c.contact_type] ?? 'muted'} className="capitalize flex-shrink-0">
                {c.contact_type}
              </Badge>
            </div>
            {c.account_name && (
              <div className="text-[11px] text-[var(--t4)] bg-[var(--bg2)] rounded-[8px] px-2.5 py-1.5 mb-2 truncate">
                {c.account_name}
              </div>
            )}
            {(c.email || c.phone) && (
              <div className="space-y-1">
                {c.email && <div className="text-xs text-[var(--t4)] truncate">{c.email}</div>}
                {c.phone && <div className="text-xs text-[var(--t4)]">{c.phone}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd && <AddContactModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); fetchContacts() }} />}
    </Layout>
  )
}
