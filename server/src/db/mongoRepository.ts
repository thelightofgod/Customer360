import { ObjectId } from 'mongodb'
import { getMongo } from './mongo'
import type {
  Account, AccountDetail, AccountSummaryStats,
  Activity, Contact, Product, ProductDetail, Ticket, SubscriptionDetail
} from '../types'

// "285,000" → 285000   |   "3,200" → 3200   |   42 → 42
function parseAmount(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0
  return 0
}

// MongoDB Date or ISO string → "YYYY-MM-DD"
function toDateStr(val: unknown): string | null {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  if (typeof val === 'string') return val.slice(0, 10)
  return null
}

// Deterministic color from account name
function accountColor(name: string): string {
  const palette = [
    '#F97316','#EAB308','#EC4899','#06B6D4','#10B981',
    '#3B82F6','#EF4444','#8B5CF6','#FACC15','#F43F5E',
    '#7C3AED','#0EA5E9',
  ]
  let h = 0
  for (const ch of name) h = ((h << 5) - h) + ch.charCodeAt(0)
  return palette[Math.abs(h) % palette.length]
}

// "Emre Yılmaz" → "EY"
function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 99999
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function docToAccount(doc: any, subs: any[]): Account {
  const name: string = doc['Account Name'] || ''
  const accountSubs = subs.filter(s => s['Account Name'] === name)
  const totalLicenses = accountSubs
    .filter(s => s['Category'] === 'License')
    .reduce((sum, s) => sum + (typeof s['Quantity'] === 'number' ? s['Quantity'] : parseInt(s['Quantity']) || 0), 0)
  const totalContractValue = accountSubs.reduce((sum, s) => sum + parseAmount(s['Total (€)']), 0)
  const arr = parseAmount(doc['ARR (€)'])

  return {
    id: doc._id.toHexString(),
    name,
    sector: doc['Sector / Industry'] || '',
    color: accountColor(name),
    edition: doc['Edition'] || '',
    tier: doc['Tier'] || '',
    csm: doc['CSM Assigned'] || '',
    nps: typeof doc['NPS (1-10)'] === 'number' ? doc['NPS (1-10)'] : null,
    sla_compliance: typeof doc['SLA Compliance %'] === 'number' ? doc['SLA Compliance %'] : null,
    avg_resolution: doc['Avg Resolution'] || null,
    open_tickets: 0,
    license_model: doc['License Model'] || null,
    arr,
    contract_start: toDateStr(doc['Contract Start']),
    renewal_date: toDateStr(doc['Renewal Date']),
    contract_status: arr > 0 ? 'active' : 'prospect',
    total_licenses: totalLicenses,
    total_contract_value: totalContractValue,
  }
}

export const mongoRepository = {
  async getAccounts(filter: string, search: string, sort: string, order: string): Promise<Account[]> {
    const db = getMongo()
    const [rawAccounts, rawSubs] = await Promise.all([
      db.collection('Accounts').find({}).toArray(),
      db.collection('Subscriptions').find({}).toArray(),
    ])

    let rows = rawAccounts.map(doc => docToAccount(doc, rawSubs))

    if (filter === 'active') rows = rows.filter(r => r.arr > 0)
    else if (filter === 'prospect') rows = rows.filter(r => r.arr === 0)
    else if (filter === 'renewal') rows = rows.filter(r => { const d = daysUntil(r.renewal_date); return d > 0 && d <= 120 })

    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(s) ||
        (r.sector || '').toLowerCase().includes(s) ||
        (r.csm || '').toLowerCase().includes(s)
      )
    }

    const sign = order === 'desc' ? -1 : 1
    if (sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name) * sign)
    else if (sort === 'arr') rows.sort((a, b) => (a.arr - b.arr) * sign)
    else if (sort === 'tickets') rows.sort((a, b) => (a.open_tickets - b.open_tickets) * sign)
    else if (sort === 'renewal') rows.sort((a, b) => (daysUntil(a.renewal_date) - daysUntil(b.renewal_date)) * sign)

    return rows
  },

  async getAccountsSummary(): Promise<AccountSummaryStats> {
    const rows = await this.getAccounts('all', '', 'name', 'asc')
    const active = rows.filter(r => r.arr > 0)
    const upcoming = rows.filter(r => { const d = daysUntil(r.renewal_date); return d > 0 && d <= 120 }).length
    return {
      total_accounts: rows.length,
      active_accounts: active.length,
      prospect_accounts: rows.length - active.length,
      total_arr: active.reduce((s, r) => s + r.arr, 0),
      total_licenses: active.reduce((s, r) => s + r.total_licenses, 0),
      upcoming_renewals: upcoming,
      total_open_tickets: 0,
    }
  },

  async getAccount(id: string): Promise<AccountDetail | null> {
    const db = getMongo()

    let doc: any
    try {
      doc = await db.collection('Accounts').findOne({ _id: new ObjectId(id) })
    } catch {
      return null
    }
    if (!doc) return null

    const name: string = doc['Account Name'] || ''

    const [rawSubs, rawContacts, rawProducts] = await Promise.all([
      db.collection('Subscriptions').find({ 'Account Name': name }).toArray(),
      db.collection('Contacts').find({ 'Account Name': name }).toArray(),
      db.collection('Product Catalog').find({}).toArray(),
    ])

    const productMap = new Map(rawProducts.map(p => [p['Product Name'] as string, p]))

    const subscriptions: SubscriptionDetail[] = rawSubs.map(s => {
      const prod = productMap.get(s['Product Name'] as string)
      return {
        id: s._id.toHexString(),
        account_id: id,
        product_id: prod ? prod._id.toHexString() : '',
        quantity: typeof s['Quantity'] === 'number' ? s['Quantity'] : parseInt(s['Quantity']) || 0,
        unit_label: s['Unit'] || '',
        unit_price: parseAmount(s['Unit Price (€)']),
        total_price: parseAmount(s['Total (€)']),
        is_active: 1,
        product_name: s['Product Name'] || '',
        category: s['Category'] || '',
        product_group: s['Product Group'] || '',
        product_unit_type: s['Unit'] || '',
      }
    })

    const contacts: Contact[] = rawContacts.map(c => ({
      id: c._id.toHexString(),
      account_id: id,
      name: c['Contact Name'] || '',
      role: c['Role / Title'] || '',
      initials: initials(c['Contact Name'] || ''),
      contact_type: (c['Contact Type'] || 'general').toLowerCase(),
      email: c['Email'] || null,
      phone: c['Phone'] || null,
    }))

    const totalLicenses = subscriptions.filter(s => s.category === 'License').reduce((sum, s) => sum + s.quantity, 0)
    const totalContractValue = subscriptions.reduce((sum, s) => sum + s.total_price, 0)
    const arr = parseAmount(doc['ARR (€)'])

    const account: Account = {
      id,
      name,
      sector: doc['Sector / Industry'] || '',
      color: accountColor(name),
      edition: doc['Edition'] || '',
      tier: doc['Tier'] || '',
      csm: doc['CSM Assigned'] || '',
      nps: typeof doc['NPS (1-10)'] === 'number' ? doc['NPS (1-10)'] : null,
      sla_compliance: typeof doc['SLA Compliance %'] === 'number' ? doc['SLA Compliance %'] : null,
      avg_resolution: doc['Avg Resolution'] || null,
      open_tickets: 0,
      license_model: doc['License Model'] || null,
      arr,
      contract_start: toDateStr(doc['Contract Start']),
      renewal_date: toDateStr(doc['Renewal Date']),
      contract_status: arr > 0 ? 'active' : 'prospect',
      total_licenses: totalLicenses,
      total_contract_value: totalContractValue,
    }

    return { ...account, contacts, tickets: [], activities: [], subscriptions, notes: doc['Notes'] || '' }
  },

  async getProducts(): Promise<Product[]> {
    const docs = await getMongo().collection('Product Catalog').find({}).toArray()
    return docs.map(doc => ({
      id: doc._id.toHexString(),
      name: doc['Product Name'] || '',
      category: doc['Category'] || '',
      product_group: doc['Product Group'] || '',
      list_price: parseAmount(doc['List Price (€)']),
      unit_type: doc['Unit Type'] || '',
      is_active: 1,
      created_at: '',
    }))
  },

  async getProduct(id: string): Promise<ProductDetail | null> {
    const db = getMongo()

    let doc: any
    try {
      doc = await db.collection('Product Catalog').findOne({ _id: new ObjectId(id) })
    } catch {
      return null
    }
    if (!doc) return null

    const productName: string = doc['Product Name'] || ''
    const [rawSubs, rawAccounts] = await Promise.all([
      db.collection('Subscriptions').find({ 'Product Name': productName }).toArray(),
      db.collection('Accounts').find({}).toArray(),
    ])

    const accountMap = new Map(rawAccounts.map(a => [a['Account Name'] as string, a]))

    const subscribers = rawSubs.map(s => {
      const acct = accountMap.get(s['Account Name'] as string)
      return {
        id: acct ? acct._id.toHexString() : '',
        name: s['Account Name'] || '',
        tier: acct ? (acct['Tier'] || '') : '',
        quantity: typeof s['Quantity'] === 'number' ? s['Quantity'] : parseInt(s['Quantity']) || 0,
        unit_price: parseAmount(s['Unit Price (€)']),
        total_price: parseAmount(s['Total (€)']),
      }
    })

    return {
      id: doc._id.toHexString(),
      name: productName,
      category: doc['Category'] || '',
      product_group: doc['Product Group'] || '',
      list_price: parseAmount(doc['List Price (€)']),
      unit_type: doc['Unit Type'] || '',
      is_active: 1,
      created_at: '',
      subscribers,
    }
  },

  async getTickets(_status?: string, _priority?: string, _accountId?: string): Promise<Ticket[]> {
    return []
  },

  async getContacts(accountId?: string): Promise<Contact[]> {
    const db = getMongo()
    let query = {}

    if (accountId) {
      try {
        const acct = await db.collection('Accounts').findOne({ _id: new ObjectId(accountId) })
        if (acct) query = { 'Account Name': acct['Account Name'] }
      } catch { /* ignore bad id */ }
    }

    const docs = await db.collection('Contacts').find(query).toArray()
    return docs.map(c => ({
      id: c._id.toHexString(),
      account_id: accountId || '',
      account_name: c['Account Name'] || '',
      name: c['Contact Name'] || '',
      role: c['Role / Title'] || '',
      initials: initials(c['Contact Name'] || ''),
      contact_type: (c['Contact Type'] || 'general').toLowerCase(),
      email: c['Email'] || null,
      phone: c['Phone'] || null,
    }))
  },

  async createContact(data: {
    accountName: string; name: string; role?: string
    contactType?: string; email?: string; phone?: string; notes?: string
  }): Promise<string> {
    const doc = {
      'Account Name': data.accountName,
      'Contact Name': data.name,
      'Role / Title': data.role || '',
      'Contact Type': data.contactType || 'General',
      'Email': data.email || '',
      'Phone': data.phone || '',
      'Notes': data.notes || '',
    }
    const result = await getMongo().collection('Contacts').insertOne(doc)
    return result.insertedId.toHexString()
  },

  async getAllSubscriptions(): Promise<SubscriptionDetail[]> {
    const db = getMongo()
    const docs = await db.collection('Subscriptions').find({}).toArray()
    return docs.map(s => ({
      id: s._id.toHexString(),
      account_id: '',
      account_name: s['Account Name'] || '',
      product_id: '',
      product_name: s['Product Name'] || '',
      category: s['Category'] || '',
      product_group: s['Product Group'] || '',
      product_unit_type: s['Unit'] || '',
      quantity: typeof s['Quantity'] === 'number' ? s['Quantity'] : parseInt(s['Quantity']) || 0,
      unit_label: s['Unit'] || '',
      unit_price: parseAmount(s['Unit Price (€)']),
      total_price: parseAmount(s['Total (€)']),
      is_active: 1,
    }))
  },

  async createSubscription(data: {
    accountName: string; productName: string; category?: string
    productGroup?: string; quantity: number; unit?: string
    unitPrice: number; notes?: string
  }): Promise<string> {
    const total = data.quantity * data.unitPrice
    const doc = {
      'Account Name': data.accountName,
      'Product Name': data.productName,
      'Category': data.category || '',
      'Product Group': data.productGroup || '',
      'Quantity': data.quantity,
      'Unit': data.unit || '',
      'Unit Price (€)': String(data.unitPrice),
      'Total (€)': String(total),
      'Notes': data.notes || '',
    }
    const result = await getMongo().collection('Subscriptions').insertOne(doc)
    return result.insertedId.toHexString()
  },

  async getActivities(_accountId?: string, _limit = 50): Promise<Activity[]> {
    return []
  },

  async updateSubscription(id: string, data: {
    productName?: string; category?: string; productGroup?: string
    quantity?: number; unit?: string; unitPrice?: number; notes?: string
  }): Promise<boolean> {
    const update: Record<string, unknown> = {}
    if (data.productName !== undefined) update['Product Name'] = data.productName
    if (data.category !== undefined) update['Category'] = data.category
    if (data.productGroup !== undefined) update['Product Group'] = data.productGroup
    if (data.quantity !== undefined) update['Quantity'] = data.quantity
    if (data.unit !== undefined) update['Unit'] = data.unit
    if (data.unitPrice !== undefined) {
      update['Unit Price (€)'] = String(data.unitPrice)
      if (data.quantity !== undefined) update['Total (€)'] = String(data.quantity * data.unitPrice)
    }
    if (data.notes !== undefined) update['Notes'] = data.notes
    const result = await getMongo().collection('Subscriptions').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    )
    return result.matchedCount === 1
  },

  async deleteSubscription(id: string): Promise<boolean> {
    const result = await getMongo().collection('Subscriptions').deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount === 1
  },

  async updateContact(id: string, data: {
    name?: string; role?: string; contactType?: string
    email?: string; phone?: string; notes?: string
  }): Promise<boolean> {
    const update: Record<string, unknown> = {}
    if (data.name !== undefined) update['Contact Name'] = data.name
    if (data.role !== undefined) update['Role / Title'] = data.role
    if (data.contactType !== undefined) update['Contact Type'] = data.contactType
    if (data.email !== undefined) update['Email'] = data.email
    if (data.phone !== undefined) update['Phone'] = data.phone
    if (data.notes !== undefined) update['Notes'] = data.notes
    const result = await getMongo().collection('Contacts').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    )
    return result.matchedCount === 1
  },

  async deleteContact(id: string): Promise<boolean> {
    const result = await getMongo().collection('Contacts').deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount === 1
  },

  async deleteAccount(id: string): Promise<boolean> {
    const result = await getMongo().collection('Accounts').deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount === 1
  },

  async createAccount(data: {
    name: string; sector?: string; tier?: string; edition?: string
    licenseModel?: string; csm?: string; contractStart?: string; renewalDate?: string
    arr?: number; nps?: number | null; slaCompliance?: number | null; avgResolution?: string; notes?: string
  }): Promise<string> {
    const doc: Record<string, unknown> = {
      'Account Name': data.name,
      'Sector / Industry': data.sector || '',
      'Tier': data.tier || '',
      'Edition': data.edition || '',
      'License Model': data.licenseModel || null,
      'CSM Assigned': data.csm || '',
      'Contract Start': data.contractStart ? new Date(data.contractStart) : null,
      'Renewal Date': data.renewalDate ? new Date(data.renewalDate) : null,
      'ARR (€)': data.arr ? String(data.arr) : '0',
      'NPS (1-10)': data.nps ?? null,
      'SLA Compliance %': data.slaCompliance ?? null,
      'Avg Resolution': data.avgResolution || null,
      'Notes': data.notes || '',
    }
    const result = await getMongo().collection('Accounts').insertOne(doc)
    return result.insertedId.toHexString()
  },
}
