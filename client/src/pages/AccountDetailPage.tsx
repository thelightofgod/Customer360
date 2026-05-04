import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import OverviewTab from '@/components/detail/OverviewTab'
import SubscriptionsTab from '@/components/detail/SubscriptionsTab'
import TicketsTab from '@/components/detail/TicketsTab'
import ContactsTab from '@/components/detail/ContactsTab'
import ActivitiesTab from '@/components/detail/ActivitiesTab'
import NotesTab from '@/components/detail/NotesTab'
import AddContactModal from '@/components/AddContactModal'
import AddSubscriptionModal from '@/components/AddSubscriptionModal'
import { api } from '@/lib/api'
import { fmtCurrency, tierVariant, licenseModelVariant } from '@/lib/utils'
import type { AccountDetail, Contact, SubscriptionDetail } from '@/types'
import AddAccountModal from '@/components/AddAccountModal'
import { ArrowLeft, ExternalLink, Pencil } from 'lucide-react'

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [account, setAccount] = useState<AccountDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showAddSub, setShowAddSub] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editingSub, setEditingSub] = useState<SubscriptionDetail | null>(null)
  const [showEditAccount, setShowEditAccount] = useState(false)

  function refreshAccount() {
    if (id) api.accounts.get(id).then(setAccount).catch(console.error)
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.accounts.get(id).then(setAccount).catch(console.error).finally(() => setLoading(false))
  }, [id])

  async function handleDeleteContact(contactId: string) {
    await api.contacts.delete(contactId)
    refreshAccount()
  }

  async function handleDeleteSub(subId: string) {
    await api.subscriptions.delete(subId)
    refreshAccount()
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 text-[var(--t4)]">Loading account…</div>
      </Layout>
    )
  }

  if (!account) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="text-[var(--t4)]">Account not found.</div>
          <Button onClick={() => navigate('/')}>Back to accounts</Button>
        </div>
      </Layout>
    )
  }

  return (
    <>
    <Layout>
      <div className="flex items-center gap-2 text-sm text-[var(--t4)] mb-4">
        <button onClick={() => navigate('/')} className="text-[var(--blue)] font-medium hover:underline cursor-pointer">
          Accounts
        </button>
        <span>/</span>
        <span>{account.name}</span>
      </div>

      <div
        className="relative rounded-[16px] border border-[var(--brd)] overflow-hidden mb-6 p-6"
        style={{ background: `linear-gradient(135deg, ${account.color}18 0%, var(--bg3) 50%)` }}
      >
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${account.color}22 0%, transparent 70%)`, transform: 'translate(-30%, -30%)' }}
        />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-[14px] flex items-center justify-center font-bold text-2xl text-white flex-shrink-0 shadow-lg"
              style={{ backgroundColor: account.color, boxShadow: `0 8px 24px ${account.color}50` }}
            >
              {account.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{account.name}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-sm text-[var(--t3)]">{account.sector}</span>
                <span className="text-[var(--brd3)]">·</span>
                <Badge variant={tierVariant(account.tier)}>{account.tier}</Badge>
                {account.license_model && (
                  <Badge variant={licenseModelVariant(account.license_model)}>{account.license_model}</Badge>
                )}
                {account.arr > 0 && (
                  <>
                    <span className="text-[var(--brd3)]">·</span>
                    <span className="text-sm font-mono font-bold text-[var(--green)]">{fmtCurrency(account.arr)}</span>
                    <span className="text-xs text-[var(--t4)]">ARR</span>
                  </>
                )}
                {account.csm && (
                  <>
                    <span className="text-[var(--brd3)]">·</span>
                    <span className="text-xs text-[var(--t3)]">CSM:</span>
                    <span className="text-xs font-medium text-[var(--t2)]">{account.csm}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
            <Button onClick={() => setShowEditAccount(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button variant="primary">
              <ExternalLink className="w-3.5 h-3.5" /> Open in Qlik
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">
            Subscriptions
            {account.subscriptions.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-[var(--blue-bg)] text-[var(--blue)] px-1.5 py-0.5 rounded-full font-mono">
                {account.subscriptions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tickets">
            Tickets
            {account.tickets.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-[var(--amber-bg)] text-[var(--amber)] px-1.5 py-0.5 rounded-full font-mono">
                {account.tickets.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts
            {account.contacts.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-white/5 text-[var(--t4)] px-1.5 py-0.5 rounded-full font-mono">
                {account.contacts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab account={account} /></TabsContent>
        <TabsContent value="subscriptions">
          <SubscriptionsTab
            account={account}
            onAdd={() => setShowAddSub(true)}
            onEdit={setEditingSub}
            onDelete={handleDeleteSub}
          />
        </TabsContent>
        <TabsContent value="tickets"><TicketsTab account={account} /></TabsContent>
        <TabsContent value="contacts">
          <ContactsTab
            account={account}
            onAdd={() => setShowAddContact(true)}
            onEdit={setEditingContact}
            onDelete={handleDeleteContact}
          />
        </TabsContent>
        <TabsContent value="activities"><ActivitiesTab account={account} /></TabsContent>
        <TabsContent value="notes"><NotesTab account={account} /></TabsContent>
      </Tabs>
    </Layout>

    <>
      {showEditAccount && (
        <AddAccountModal
          initialData={account}
          onClose={() => setShowEditAccount(false)}
          onCreated={() => { setShowEditAccount(false); refreshAccount() }}
        />
      )}
      {showAddContact && (
        <AddContactModal
          prefilledAccount={{ id: account.id, name: account.name }}
          onClose={() => setShowAddContact(false)}
          onSaved={() => { setShowAddContact(false); refreshAccount() }}
        />
      )}
      {editingContact && (
        <AddContactModal
          initialData={editingContact}
          onClose={() => setEditingContact(null)}
          onSaved={() => { setEditingContact(null); refreshAccount() }}
        />
      )}
      {showAddSub && (
        <AddSubscriptionModal
          prefilledAccount={{ id: account.id, name: account.name }}
          onClose={() => setShowAddSub(false)}
          onCreated={() => { setShowAddSub(false); refreshAccount() }}
        />
      )}
      {editingSub && (
        <AddSubscriptionModal
          initialData={editingSub}
          onClose={() => setEditingSub(null)}
          onCreated={() => { setEditingSub(null); refreshAccount() }}
        />
      )}
    </>
    </>
  )
}
