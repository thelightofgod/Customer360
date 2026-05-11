import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '@/components/Layout'
import SummaryCards from '@/components/SummaryCards'
import AccountTable from '@/components/AccountTable'
import AddAccountModal from '@/components/AddAccountModal'
import Pagination from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { Account, AccountSummaryStats } from '@/types'
import { Plus } from 'lucide-react'

const PAGE_LIMIT = 20

export default function AccountsPage() {
  const [stats, setStats] = useState<AccountSummaryStats | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState('name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.accounts.summary().then(setStats).catch(console.error)
  }, [])

  function handleSearch(val: string) {
    setSearch(val)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300)
  }

  function handleFilter(val: string) {
    setFilter(val)
    setPage(1)
  }

  const fetchAccounts = useCallback(() => {
    setLoading(true)
    api.accounts
      .list({ filter, search: debouncedSearch, sort, order, page, limit: PAGE_LIMIT })
      .then(d => { setAccounts(d.accounts); setTotal(d.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter, debouncedSearch, sort, order, page])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  function handleSort(col: string) {
    if (sort === col) setOrder(o => (o === 'asc' ? 'desc' : 'asc'))
    else { setSort(col); setOrder('asc') }
    setPage(1)
  }

  function handleCreated() {
    setShowAdd(false)
    fetchAccounts()
    api.accounts.summary().then(setStats).catch(console.error)
  }

  return (
    <>
    <Layout>
      {stats && <SummaryCards stats={stats} />}
      <div className="flex justify-end mb-4 mt-2">
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> New Account
        </Button>
      </div>
      <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        <AccountTable
          accounts={accounts}
          total={total}
          filter={filter}
          search={search}
          sort={sort}
          order={order}
          onFilter={handleFilter}
          onSearch={handleSearch}
          onSort={handleSort}
          onDeleted={handleCreated}
        />
        <Pagination page={page} total={total} limit={PAGE_LIMIT} onChange={setPage} />
      </div>
    </Layout>
    {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />}
    </>
  )
}
