import type { Account, AccountDetail, AccountSummaryStats, Contact, Activity, Ticket, SubscriptionDetail, Product } from '@/types'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

async function post(path: string, body: unknown) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.ok ? r.json() : r.json().then((e: any) => Promise.reject(e.error))
}

export const api = {
  accounts: {
    list: (params?: { filter?: string; search?: string; sort?: string; order?: string }) => {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v)) as Record<string, string>
      ).toString()
      return get<{ accounts: Account[]; total: number }>(`/api/accounts${q ? '?' + q : ''}`)
    },
    summary: () => get<AccountSummaryStats>('/api/accounts/summary'),
    get: (id: string) => get<AccountDetail>(`/api/accounts/${id}`),
    create: (body: Record<string, unknown>) => post('/api/accounts', body),
    delete: (id: string) =>
      fetch(`/api/accounts/${id}`, { method: 'DELETE' })
        .then(r => r.ok ? r.json() : r.json().then((e: any) => Promise.reject(e.error))),
  },
  subscriptions: {
    list: () => get<{ subscriptions: SubscriptionDetail[]; total: number }>('/api/subscriptions'),
    create: (body: Record<string, unknown>) => post('/api/subscriptions', body),
    update: (id: string, body: Record<string, unknown>) =>
      fetch(`/api/subscriptions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(r => r.ok ? r.json() : r.json().then((e: any) => Promise.reject(e.error))),
    delete: (id: string) =>
      fetch(`/api/subscriptions/${id}`, { method: 'DELETE' })
        .then(r => r.ok ? r.json() : r.json().then((e: any) => Promise.reject(e.error))),
  },
  contacts: {
    list: (accountId?: string) =>
      get<{ contacts: Contact[]; total: number }>(`/api/contacts${accountId ? '?account_id=' + accountId : ''}`),
    create: (body: Record<string, unknown>) => post('/api/contacts', body),
    update: (id: string, body: Record<string, unknown>) =>
      fetch(`/api/contacts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(r => r.ok ? r.json() : r.json().then((e: any) => Promise.reject(e.error))),
    delete: (id: string) =>
      fetch(`/api/contacts/${id}`, { method: 'DELETE' })
        .then(r => r.ok ? r.json() : r.json().then((e: any) => Promise.reject(e.error))),
  },
  products: {
    list: () => get<{ products: Product[]; total: number }>('/api/products'),
  },
  tickets: {
    list: (params?: { status?: string; priority?: string; account_id?: string }) => {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v)) as Record<string, string>
      ).toString()
      return get<{ tickets: Ticket[]; total: number }>(`/api/tickets${q ? '?' + q : ''}`)
    },
  },
  activities: {
    list: (accountId?: string, limit?: number) => {
      const params = new URLSearchParams()
      if (accountId) params.set('account_id', accountId)
      if (limit) params.set('limit', String(limit))
      const q = params.toString()
      return get<{ activities: Activity[]; total: number }>(`/api/activities${q ? '?' + q : ''}`)
    },
  },
}
