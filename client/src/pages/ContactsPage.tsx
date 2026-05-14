import { useEffect, useState, useRef } from 'react'
import Layout from '@/components/Layout'
import AddContactModal from '@/components/AddContactModal'
import Pagination from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { Contact } from '@/types'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'

const TYPE_VARIANTS: Record<string, 'purple' | 'blue' | 'green' | 'muted'> = {
  sponsor: 'purple', technical: 'blue', business: 'green', admin: 'muted',
}

const TYPE_COLORS: Record<string, string> = {
  sponsor: '#a07cf0',
  technical: '#5b9eff',
  business: '#2ed896',
  admin: '#3f5278',
  general: '#1ad0e8',
}

const PAGE_LIMIT = 18

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function fetchContacts(p = page, s = debouncedSearch) {
    setLoading(true)
    api.contacts.list({ search: s, page: p, limit: PAGE_LIMIT })
      .then(d => { setContacts(d.contacts); setTotal(d.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchContacts(page, debouncedSearch) }, [page, debouncedSearch])

  function handleSearch(val: string) {
    setSearch(val)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300)
  }

  async function handleDelete(id: string) {
    try {
      await api.contacts.delete(id)
      toast.success('Contact deleted')
      setDeletingId(null)
      fetchContacts()
    } catch (e) {
      console.error('Failed to delete contact', e)
      toast.error('Failed to delete contact')
      setDeletingId(null)
    }
  }

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--t1)] tracking-tight">Contacts</h1>
          <p className="text-sm text-[var(--t4)] mt-0.5">{total} contacts across all accounts</p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> New Contact
        </Button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--t4)]" />
        <Input
          placeholder="Search by name, account, role..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="pl-8 w-full sm:max-w-sm"
        />
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {contacts.length === 0 && !loading && (
          <div className="col-span-3 text-center py-20 text-[var(--t4)]">
            <div className="text-3xl mb-3 opacity-40">👥</div>
            No contacts found
          </div>
        )}
        {contacts.map(c => {
          const accent = TYPE_COLORS[c.contact_type] ?? 'var(--t4)'
          return (
            <div
              key={c.id}
              className="rounded-[16px] p-4 flex flex-col transition-all duration-200 hover:-translate-y-0.5 group"
              style={{
                background: 'rgba(17, 31, 50, 0.70)',
                border: '1px solid var(--brd)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brd2)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brd)'}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
                  style={{
                    background: `${accent}18`,
                    color: accent,
                    border: `1px solid ${accent}30`,
                    boxShadow: `0 3px 12px ${accent}20`,
                  }}
                >
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
                <div
                  className="text-[11px] text-[var(--t4)] rounded-[8px] px-2.5 py-1.5 mb-2 truncate font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
                >
                  {c.account_name}
                </div>
              )}

              {(c.email || c.phone) && (
                <div className="space-y-1 mb-3">
                  {c.email && <div className="text-xs text-[var(--t3)] truncate">{c.email}</div>}
                  {c.phone && <div className="text-xs text-[var(--t3)]">{c.phone}</div>}
                </div>
              )}

              <div className="mt-auto pt-3 border-t border-white/[0.04] flex items-center justify-end gap-2">
                {deletingId === c.id ? (
                  <>
                    <span className="text-xs text-[var(--t4)] mr-1">Delete?</span>
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-[var(--red)] hover:underline font-semibold">Confirm</button>
                    <button onClick={() => setDeletingId(null)} className="text-xs text-[var(--t4)] hover:underline">Cancel</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingContact(c)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--t4)] transition-all duration-150 hover:text-[var(--t1)]"
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(c.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--t4)] transition-all duration-150 hover:text-[var(--red)]"
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-bg)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Pagination page={page} total={total} limit={PAGE_LIMIT} onChange={setPage} />

      {showAdd && (
        <AddContactModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchContacts() }}
        />
      )}
      {editingContact && (
        <AddContactModal
          initialData={editingContact}
          onClose={() => setEditingContact(null)}
          onSaved={() => { setEditingContact(null); fetchContacts() }}
        />
      )}
    </Layout>
  )
}
