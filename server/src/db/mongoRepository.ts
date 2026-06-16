import { ObjectId } from 'mongodb'
import { getMongo } from './mongo'
import type {
  Account, AccountDetail, AccountSummaryStats,
  Activity, Contact, Product, ProductDetail, Ticket, SubscriptionDetail, PaymentSchedule, Deal, Sale
} from '../types'

// ---------------------------------------------------------------------------
// Raw-collection cache — invalidated on every write, avoids reloading all
// accounts + subscriptions + contacts on every list/summary request.
// ---------------------------------------------------------------------------
interface RawCache { accounts: any[]; subs: any[]; contacts: any[]; ts: number }
let rawCache: RawCache | null = null
const CACHE_TTL_MS = 60_000 // safety-net TTL; writes always invalidate first

async function getRawCollections() {
  if (rawCache && Date.now() - rawCache.ts < CACHE_TTL_MS) return rawCache
  const db = getMongo()
  const [accounts, subs, contacts] = await Promise.all([
    db.collection('Accounts').find({}).toArray(),
    db.collection('Subscriptions').find({}).toArray(),
    db.collection('Contacts').find({}).toArray(),
  ])
  rawCache = { accounts, subs, contacts, ts: Date.now() }
  return rawCache
}

function invalidateCache() { rawCache = null }

// ---------------------------------------------------------------------------

// Turkish-aware normalization: İstanbul→istanbul, Şirket→sirket, etc.
function trNorm(s: string): string {
  return s.toLocaleLowerCase('tr')
    .replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o')
    .replace(/ı/g, 'i').replace(/ç/g, 'c')
}

// "285,000" → 285000   |   "3,200" → 3200   |   42 → 42
function parseAmount(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0
  return 0
}

// Handles both Turkish ("7.000,00 €") and US ("7,000.00") number formats
function parsePrice(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const s = val.replace(/[^0-9.,]/g, '')
    if (!s) return 0
    if (/,\d{2}$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) return parseFloat(s.replace(/\./g, '')) || 0
    return parseFloat(s.replace(/,/g, '')) || 0
  }
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

// A Sale is "active" if its commitment period hasn't ended yet.
function isSaleActive(s: any): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (s.lisans_turu === 'yeni') {
    // Use last period end date if available
    if (Array.isArray(s.lisans_periodlari) && s.lisans_periodlari.length > 0) {
      const last = s.lisans_periodlari[s.lisans_periodlari.length - 1]
      if (last.bitis) return new Date(last.bitis) >= today
    }
    // Fallback: fatura_tarihi + yil_sayisi years
    if (s.fatura_tarihi && s.yil_sayisi) {
      const end = new Date(s.fatura_tarihi)
      end.setFullYear(end.getFullYear() + (parseInt(s.yil_sayisi) || 0))
      return end >= today
    }
    return false // no date info → exclude from ARR
  } else {
    if (s.taahhut_bitis_tarihi) return new Date(s.taahhut_bitis_tarihi) >= today
    return false
  }
}

function computeArrFromSales(sales: any[]): number {
  return sales
    .filter(isSaleActive)
    .reduce((sum, s) => {
      if (typeof s.annual_value_eur === 'number') return sum + s.annual_value_eur
      const val = s.lisans_turu === 'yeni' ? s.indirimli_musteri_bedeli_yeni : s.indirimli_musteri_bedeli_ek
      return sum + parsePrice(val)
    }, 0)
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
    address: doc['Address'] || null,
    partner_name: doc['Partner Name'] || null,
    partner_margin: doc['Partner Margin %'] != null ? parseAmount(doc['Partner Margin %']) || null : null,
    partner_license_price: doc['Partner License Price (€)'] ? parseAmount(doc['Partner License Price (€)']) : null,
    currency: doc['Currency'] || null,
    invoice_date: toDateStr(doc['Invoice Date']),
    payment_terms: doc['Payment Terms'] || null,
    consulting_days: doc['Consulting Days'] || null,
    training_info: doc['Training Info'] || null,
  }
}

function docToSale(doc: any): Sale {
  return {
    id: doc._id.toHexString(),
    firma_adi: doc.firma_adi || '',
    firma_adresi: doc.firma_adresi || null,
    kontak_adi: doc.kontak_adi || null,
    kontak_gorevi: doc.kontak_gorevi || null,
    kontak_email: doc.kontak_email || null,
    finans_kontak_adi: doc.finans_kontak_adi || null,
    finans_kontak_gorevi: doc.finans_kontak_gorevi || null,
    finans_kontak_email: doc.finans_kontak_email || null,
    lisans_turu: doc.lisans_turu || 'yeni',
    yil_sayisi: doc.yil_sayisi || null,
    musteri_liste_bedeli_yeni: doc.musteri_liste_bedeli_yeni || null,
    indirimli_musteri_bedeli_yeni: doc.indirimli_musteri_bedeli_yeni || null,
    musteri_liste_bedeli_ek: doc.musteri_liste_bedeli_ek || null,
    indirimli_musteri_bedeli_ek: doc.indirimli_musteri_bedeli_ek || null,
    taahhut_bitis_tarihi: doc.taahhut_bitis_tarihi || null,
    kalan_ay: doc.kalan_ay || null,
    kalan_donem_net_tutar: doc.kalan_donem_net_tutar || null,
    urunler: doc.urunler || {},
    partner: doc.partner || null,
    partner_marj: doc.partner_marj || null,
    partner_lisans_bedeli: doc.partner_lisans_bedeli || null,
    kur: doc.kur || null,
    fatura_tarihi: doc.fatura_tarihi || null,
    odeme_vadesi: doc.odeme_vadesi || null,
    danismanlik_adam_gun: doc.danismanlik_adam_gun || null,
    egitim: doc.egitim || null,
    not: doc.not || null,
    lisans_periodlari: doc.lisans_periodlari || null,
    contacts: Array.isArray(doc.contacts) ? doc.contacts : null,
    account_id: doc.account_id || null,
    deal_id: doc.deal_id || null,
    subscription_ids: doc.subscription_ids || null,
    annual_value_eur: typeof doc.annual_value_eur === 'number' ? doc.annual_value_eur : null,
    total_value_eur: typeof doc.total_value_eur === 'number' ? doc.total_value_eur : null,
    created_at: doc.created_at instanceof Date ? doc.created_at.toISOString().slice(0, 10) : (doc.created_at || new Date().toISOString().slice(0, 10)),
    created_by: doc.created_by || null,
  }
}

function docToDeal(doc: any): Deal {
  const lines = (doc['Lines'] || []).map((l: any) => ({
    product_name: l['Product Name'] || '',
    category: l['Category'] || '',
    product_group: l['Product Group'] || '',
    quantity: typeof l['Quantity'] === 'number' ? l['Quantity'] : parseInt(l['Quantity']) || 0,
    unit: l['Unit'] || '',
    list_price: parseAmount(l['List Price (€)']),
    unit_price: parseAmount(l['Unit Price (€)']),
    total_price: parseAmount(l['Total (€)']),
  }))
  const payment_schedule = (doc['Payment Schedule'] || []).map((p: any) => ({
    period_start: toDateStr(p['Period Start']) || '',
    period_end: toDateStr(p['Period End']) || '',
    amount: parseAmount(p['Amount (€)']),
    invoice_date: toDateStr(p['Invoice Date']),
  }))
  const total_value = lines.reduce((sum: number, l: any) => sum + l.total_price, 0)
  return {
    id: doc._id.toHexString(),
    account_name: doc['Account Name'] || '',
    deal_type: doc['Deal Type'] || 'New Sale',
    deal_status: doc['Deal Status'] || 'Proposal',
    contract_start: toDateStr(doc['Contract Start']),
    contract_end: toDateStr(doc['Contract End']),
    subscription_years: doc['Subscription Years'] ?? null,
    finance_contact: doc['Finance Contact'] || null,
    existing_commitment_end: toDateStr(doc['Existing Commitment End']),
    remaining_months: doc['Remaining Months'] ?? null,
    remaining_period_price: doc['Remaining Period Price (€)'] ? parseAmount(doc['Remaining Period Price (€)']) : null,
    partner_name: doc['Partner Name'] || null,
    partner_margin: doc['Partner Margin %'] != null ? parseAmount(doc['Partner Margin %']) || null : null,
    partner_license_price: doc['Partner License Price (€)'] ? parseAmount(doc['Partner License Price (€)']) : null,
    currency: doc['Currency'] || null,
    invoice_date: toDateStr(doc['Invoice Date']),
    payment_terms: doc['Payment Terms'] || null,
    consulting_days: doc['Consulting Days'] || null,
    training_info: doc['Training Info'] || null,
    notes: doc['Notes'] || null,
    total_value,
    lines,
    payment_schedule,
    created_at: doc['Created At'] instanceof Date ? doc['Created At'].toISOString() : new Date().toISOString(),
  }
}

function buildDealDoc(data: {
  accountName: string; dealType: string; dealStatus: string
  contractStart?: string; contractEnd?: string; subscriptionYears?: number | null
  financeContact?: string; existingCommitmentEnd?: string
  remainingMonths?: number | null; remainingPeriodPrice?: number | null
  partnerName?: string; partnerMargin?: number | null; partnerLicensePrice?: number | null; currency?: string
  invoiceDate?: string; paymentTerms?: string; consultingDays?: string; trainingInfo?: string; notes?: string
  lines: Array<{ productName: string; category: string; productGroup: string; quantity: number; unit: string; listPrice: number; unitPrice: number }>
  paymentSchedule: Array<{ periodStart: string; periodEnd: string; amount: number; invoiceDate?: string | null }>
}): Record<string, unknown> {
  return {
    'Account Name': data.accountName,
    'Deal Type': data.dealType,
    'Deal Status': data.dealStatus,
    'Contract Start': data.contractStart ? new Date(data.contractStart) : null,
    'Contract End': data.contractEnd ? new Date(data.contractEnd) : null,
    'Subscription Years': data.subscriptionYears ?? null,
    'Finance Contact': data.financeContact || null,
    'Existing Commitment End': data.existingCommitmentEnd ? new Date(data.existingCommitmentEnd) : null,
    'Remaining Months': data.remainingMonths ?? null,
    'Remaining Period Price (€)': data.remainingPeriodPrice != null ? String(data.remainingPeriodPrice) : null,
    'Partner Name': data.partnerName || null,
    'Partner Margin %': data.partnerMargin ?? null,
    'Partner License Price (€)': data.partnerLicensePrice != null ? String(data.partnerLicensePrice) : null,
    'Currency': data.currency || null,
    'Invoice Date': data.invoiceDate ? new Date(data.invoiceDate) : null,
    'Payment Terms': data.paymentTerms || null,
    'Consulting Days': data.consultingDays || null,
    'Training Info': data.trainingInfo || null,
    'Notes': data.notes || null,
    'Lines': data.lines.map(l => ({
      'Product Name': l.productName,
      'Category': l.category,
      'Product Group': l.productGroup,
      'Quantity': l.quantity,
      'Unit': l.unit,
      'List Price (€)': String(l.listPrice),
      'Unit Price (€)': String(l.unitPrice),
      'Total (€)': String(l.quantity * l.unitPrice),
    })),
    'Payment Schedule': data.paymentSchedule.map(p => ({
      'Period Start': new Date(p.periodStart),
      'Period End': new Date(p.periodEnd),
      'Amount (€)': String(p.amount),
      'Invoice Date': p.invoiceDate ? new Date(p.invoiceDate) : null,
    })),
  }
}

function docToSubscription(s: any, accountId = '', productMap?: Map<string, any>): SubscriptionDetail {
  const prod = productMap?.get(s['Product Name'] as string)
  const qty = typeof s['Quantity'] === 'number' ? s['Quantity'] : parseInt(s['Quantity']) || 0
  const rawYears = s['Subscription Years']
  return {
    id: s._id.toHexString(),
    account_id: accountId,
    account_name: s['Account Name'] || '',
    product_id: prod ? prod._id.toHexString() : '',
    quantity: qty,
    unit_label: s['Unit'] || '',
    list_price: s['List Price (€)'] != null ? parseAmount(s['List Price (€)']) : null,
    unit_price: parseAmount(s['Unit Price (€)']),
    total_price: parseAmount(s['Total (€)']),
    is_active: 1,
    product_name: s['Product Name'] || '',
    category: s['Category'] || '',
    product_group: s['Product Group'] || '',
    product_unit_type: s['Unit'] || '',
    subscription_years: rawYears != null ? (typeof rawYears === 'number' ? rawYears : parseInt(rawYears) || null) : null,
    commitment_end_date: toDateStr(s['Commitment End Date']),
    invoice_date: toDateStr(s['Invoice Date']),
    payment_periods: Array.isArray(s['Payment Periods'])
      ? s['Payment Periods'].map((p: any) => ({
          period_start: toDateStr(p['Period Start']) || '',
          period_end: toDateStr(p['Period End']) || '',
          amount: parseAmount(p['Amount (€)']),
          original_amount: p['Original Amount (€)'] != null ? parseAmount(p['Original Amount (€)']) : null,
        }))
      : null,
    lisans_turu: s['License Type'] || null,
    sale_id: s['Sale ID'] || null,
  }
}

export const mongoRepository = {
  async getAccounts(
    filter: string, search: string, sort: string, order: string,
    page = 1, limit = 20
  ): Promise<{ accounts: Account[]; total: number }> {
    const { accounts: rawAccounts, subs: rawSubs } = await getRawCollections()

    let rows = rawAccounts.map(doc => docToAccount(doc, rawSubs))

    if (filter === 'active') rows = rows.filter(r => r.arr > 0)
    else if (filter === 'prospect') rows = rows.filter(r => r.arr === 0)
    else if (filter === 'renewal') rows = rows.filter(r => { const d = daysUntil(r.renewal_date); return d > 0 && d <= 120 })

    if (search) {
      const tokens = search.trim().split(/\s+/).map(trNorm).filter(Boolean)
      rows = rows.filter(r => {
        const name = trNorm(r.name)
        const extra = trNorm((r.sector || '') + ' ' + (r.csm || ''))
        return tokens.every(t => name.includes(t) || extra.includes(t))
      })
      // Relevance sort: exact start > word-start > contains
      const q = trNorm(search.trim())
      rows.sort((a, b) => {
        const score = (n: string) => {
          const nn = trNorm(n)
          if (nn.startsWith(q)) return 0
          if (nn.split(/\s+/).some(w => w.startsWith(tokens[0]))) return 1
          return 2
        }
        return score(a.name) - score(b.name)
      })
    } else {
      const sign = order === 'desc' ? -1 : 1
      if (sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name, 'tr') * sign)
      else if (sort === 'arr') rows.sort((a, b) => (a.arr - b.arr) * sign)
      else if (sort === 'tickets') rows.sort((a, b) => (a.open_tickets - b.open_tickets) * sign)
      else if (sort === 'renewal') rows.sort((a, b) => (daysUntil(a.renewal_date) - daysUntil(b.renewal_date)) * sign)
    }

    const total = rows.length
    const start = (page - 1) * limit
    return { accounts: rows.slice(start, start + limit), total }
  },

  async getAccountsSummary(): Promise<AccountSummaryStats> {
    const { accounts: rawAccounts, subs: rawSubs } = await getRawCollections()
    const rows = rawAccounts.map(doc => docToAccount(doc, rawSubs))
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
    const nameRegex = { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }

    const [rawSubs, rawContacts, rawProducts, rawSchedules, rawSales] = await Promise.all([
      db.collection('Subscriptions').find({ 'Account Name': nameRegex }).toArray(),
      db.collection('Contacts').find({ 'Account Name': nameRegex }).toArray(),
      db.collection('Product Catalog').find({}).toArray(),
      db.collection('PaymentSchedules').find({ 'Account Name': nameRegex }).toArray(),
      db.collection('Sales').find({ account_id: id }).toArray(),
    ])

    const productMap = new Map(rawProducts.map(p => [p['Product Name'] as string, p]))

    const subscriptions: SubscriptionDetail[] = rawSubs.map(s => docToSubscription(s, id, productMap))

    const contacts: Contact[] = rawContacts.map(c => ({
      id: c._id.toHexString(),
      account_id: id,
      account_name: name,
      name: c['Contact Name'] || '',
      role: c['Role / Title'] || '',
      initials: initials(c['Contact Name'] || ''),
      contact_type: (c['Contact Type'] || 'general').toLowerCase(),
      email: c['Email'] || null,
      phone: c['Phone'] || null,
    }))

    const payment_schedules: PaymentSchedule[] = rawSchedules.map(d => ({
      id: d._id.toHexString(),
      account_id: id,
      period_start: toDateStr(d['Period Start']) || '',
      period_end: toDateStr(d['Period End']) || '',
      amount: parseAmount(d['Amount (€)']),
      invoice_date: toDateStr(d['Invoice Date']),
    }))

    const freshArr = computeArrFromSales(rawSales)
    return { ...docToAccount(doc, rawSubs), arr: freshArr, contacts, tickets: [], activities: [], subscriptions, notes: doc['Notes'] || '', payment_schedules }
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

  async getContacts(
    accountId?: string, search?: string, page = 1, limit = 18
  ): Promise<{ contacts: Contact[]; total: number }> {
    const { accounts: rawAccounts, contacts: rawContacts } = await getRawCollections()

    const accountNameToId = new Map(rawAccounts.map(a => [a['Account Name'] as string, a._id.toHexString()]))

    let accountName: string | undefined
    if (accountId) {
      const acct = rawAccounts.find(a => {
        try { return a._id.toHexString() === accountId } catch { return false }
      })
      if (!acct) return { contacts: [], total: 0 }
      accountName = acct['Account Name'] as string
    }

    let results: Contact[] = rawContacts
      .filter(c => !accountName || c['Account Name'] === accountName)
      .map(c => ({
        id: c._id.toHexString(),
        account_id: accountId || accountNameToId.get(c['Account Name'] as string) || '',
        account_name: c['Account Name'] || '',
        name: c['Contact Name'] || '',
        role: c['Role / Title'] || '',
        initials: initials(c['Contact Name'] || ''),
        contact_type: (c['Contact Type'] || 'general').toLowerCase(),
        email: c['Email'] || null,
        phone: c['Phone'] || null,
      }))

    if (search) {
      const s = trNorm(search)
      results = results.filter(c =>
        trNorm(c.name).includes(s) ||
        trNorm(c.account_name || '').includes(s) ||
        trNorm(c.role || '').includes(s)
      )
    }

    const total = results.length
    const start = (page - 1) * limit
    return { contacts: results.slice(start, start + limit), total }
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
    invalidateCache()
    return result.insertedId.toHexString()
  },


  async getAllSubscriptions(
    search?: string, page = 1, limit = 20
  ): Promise<{ subscriptions: SubscriptionDetail[]; total: number }> {
    const { subs: rawSubs, accounts: rawAccounts } = await getRawCollections()
    const accountNameToId = new Map(rawAccounts.map(a => [a['Account Name'] as string, a._id.toHexString()]))
    let results: SubscriptionDetail[] = rawSubs.map(s => {
      const accountId = accountNameToId.get(s['Account Name'] as string) || ''
      return docToSubscription(s, accountId)
    })

    if (search) {
      const s = trNorm(search)
      results = results.filter(sub =>
        trNorm(sub.product_name || '').includes(s) ||
        trNorm(sub.account_name || '').includes(s) ||
        trNorm(sub.category || '').includes(s)
      )
    }

    const total = results.length
    const start = (page - 1) * limit
    return { subscriptions: results.slice(start, start + limit), total }
  },

  async createSubscription(data: {
    accountName: string; productName: string; category?: string
    productGroup?: string; quantity: number; unit?: string
    listPrice?: number | null; unitPrice: number; notes?: string
    subscriptionYears?: number | null; commitmentEndDate?: string
    invoiceDate?: string | null
    paymentPeriods?: Array<{ periodStart: string; periodEnd: string; amount: number; originalAmount?: number | null }> | null
    lisansTuru?: 'yeni' | 'ek' | null
    saleId?: string | null
  }): Promise<string> {
    const total = data.quantity * data.unitPrice
    const doc: Record<string, unknown> = {
      'Account Name': data.accountName,
      'Product Name': data.productName,
      'Category': data.category || '',
      'Product Group': data.productGroup || '',
      'Quantity': data.quantity,
      'Unit': data.unit || '',
      'List Price (€)': data.listPrice != null ? String(data.listPrice) : null,
      'Unit Price (€)': String(data.unitPrice),
      'Total (€)': String(total),
      'Subscription Years': data.subscriptionYears ?? null,
      'Commitment End Date': data.commitmentEndDate ? new Date(data.commitmentEndDate) : null,
      'Invoice Date': data.invoiceDate ? new Date(data.invoiceDate) : null,
      'Notes': data.notes || '',
      'License Type': data.lisansTuru ?? null,
      'Sale ID': data.saleId ?? null,
      'Payment Periods': data.paymentPeriods
        ? data.paymentPeriods.map(p => ({
            'Period Start': new Date(p.periodStart),
            'Period End': new Date(p.periodEnd),
            'Amount (€)': String(p.amount),
            'Original Amount (€)': p.originalAmount != null ? String(p.originalAmount) : null,
          }))
        : null,
    }
    const result = await getMongo().collection('Subscriptions').insertOne(doc)
    invalidateCache()
    return result.insertedId.toHexString()
  },

  async getActivities(_accountId?: string, _limit = 50): Promise<Activity[]> {
    return []
  },

  async updateSubscription(id: string, data: {
    productName?: string; category?: string; productGroup?: string
    quantity?: number; unit?: string; listPrice?: number | null; unitPrice?: number; notes?: string
    subscriptionYears?: number | null; commitmentEndDate?: string | null
    invoiceDate?: string | null
    paymentPeriods?: Array<{ periodStart: string; periodEnd: string; amount: number; originalAmount?: number | null }> | null
  }): Promise<boolean> {
    const db = getMongo()
    const existing = await db.collection('Subscriptions').findOne({ _id: new ObjectId(id) })
    if (!existing) return false

    const update: Record<string, unknown> = {}
    if (data.productName !== undefined) update['Product Name'] = data.productName
    if (data.category !== undefined) update['Category'] = data.category
    if (data.productGroup !== undefined) update['Product Group'] = data.productGroup
    if (data.quantity !== undefined) update['Quantity'] = data.quantity
    if (data.unit !== undefined) update['Unit'] = data.unit
    if (data.listPrice !== undefined) update['List Price (€)'] = data.listPrice != null ? String(data.listPrice) : null
    if (data.unitPrice !== undefined) update['Unit Price (€)'] = String(data.unitPrice)
    if (data.notes !== undefined) update['Notes'] = data.notes
    if (data.subscriptionYears !== undefined) update['Subscription Years'] = data.subscriptionYears ?? null
    if (data.commitmentEndDate !== undefined) update['Commitment End Date'] = data.commitmentEndDate ? new Date(data.commitmentEndDate) : null
    if (data.invoiceDate !== undefined) update['Invoice Date'] = data.invoiceDate ? new Date(data.invoiceDate) : null
    if (data.paymentPeriods !== undefined) {
      update['Payment Periods'] = data.paymentPeriods
        ? data.paymentPeriods.map(p => ({
            'Period Start': new Date(p.periodStart),
            'Period End': new Date(p.periodEnd),
            'Amount (€)': String(p.amount),
            'Original Amount (€)': p.originalAmount != null ? String(p.originalAmount) : null,
          }))
        : null
    }

    const finalQty = data.quantity ?? (typeof existing['Quantity'] === 'number' ? existing['Quantity'] : parseInt(existing['Quantity']) || 0)
    const finalPrice = data.unitPrice ?? parseAmount(existing['Unit Price (€)'])
    update['Total (€)'] = String(finalQty * finalPrice)

    const result = await db.collection('Subscriptions').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    )
    invalidateCache()
    return result.matchedCount === 1
  },

  async deleteSubscription(id: string): Promise<boolean> {
    const result = await getMongo().collection('Subscriptions').deleteOne({ _id: new ObjectId(id) })
    invalidateCache()
    return result.deletedCount === 1
  },

  async updateContact(id: string, data: {
    name?: string; role?: string; contactType?: string
    email?: string; phone?: string; notes?: string; accountName?: string
  }): Promise<boolean> {
    const update: Record<string, unknown> = {}
    if (data.accountName !== undefined) update['Account Name'] = data.accountName
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
    invalidateCache()
    return result.matchedCount === 1
  },

  async deleteContact(id: string): Promise<boolean> {
    const result = await getMongo().collection('Contacts').deleteOne({ _id: new ObjectId(id) })
    invalidateCache()
    return result.deletedCount === 1
  },

  async updateAccount(id: string, data: {
    sector?: string; tier?: string; edition?: string; licenseModel?: string
    csm?: string; contractStart?: string; renewalDate?: string; arr?: number
    nps?: number | null; slaCompliance?: number | null; avgResolution?: string; notes?: string
    address?: string; partnerName?: string; partnerMargin?: number | null
    partnerLicensePrice?: number | null; currency?: string
    invoiceDate?: string; paymentTerms?: string; consultingDays?: string; trainingInfo?: string
  }): Promise<boolean> {
    const update: Record<string, unknown> = {}
    if (data.sector !== undefined) update['Sector / Industry'] = data.sector
    if (data.tier !== undefined) update['Tier'] = data.tier
    if (data.edition !== undefined) update['Edition'] = data.edition
    if (data.licenseModel !== undefined) update['License Model'] = data.licenseModel || null
    if (data.csm !== undefined) update['CSM Assigned'] = data.csm
    if (data.contractStart !== undefined) update['Contract Start'] = data.contractStart ? new Date(data.contractStart) : null
    if (data.renewalDate !== undefined) update['Renewal Date'] = data.renewalDate ? new Date(data.renewalDate) : null
    if (data.arr !== undefined) update['ARR (€)'] = String(data.arr)
    if (data.nps !== undefined) update['NPS (1-10)'] = data.nps
    if (data.slaCompliance !== undefined) update['SLA Compliance %'] = data.slaCompliance
    if (data.avgResolution !== undefined) update['Avg Resolution'] = data.avgResolution
    if (data.notes !== undefined) update['Notes'] = data.notes
    if (data.address !== undefined) update['Address'] = data.address || null
    if (data.partnerName !== undefined) update['Partner Name'] = data.partnerName || null
    if (data.partnerMargin !== undefined) update['Partner Margin %'] = data.partnerMargin ?? null
    if (data.partnerLicensePrice !== undefined) update['Partner License Price (€)'] = data.partnerLicensePrice != null ? String(data.partnerLicensePrice) : null
    if (data.currency !== undefined) update['Currency'] = data.currency || null
    if (data.invoiceDate !== undefined) update['Invoice Date'] = data.invoiceDate ? new Date(data.invoiceDate) : null
    if (data.paymentTerms !== undefined) update['Payment Terms'] = data.paymentTerms || null
    if (data.consultingDays !== undefined) update['Consulting Days'] = data.consultingDays || null
    if (data.trainingInfo !== undefined) update['Training Info'] = data.trainingInfo || null
    const result = await getMongo().collection('Accounts').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    )
    invalidateCache()
    return result.matchedCount === 1
  },

  async createPaymentSchedule(data: {
    accountName: string; periodStart: string; periodEnd: string
    amount: number; invoiceDate?: string | null
  }): Promise<string> {
    const doc = {
      'Account Name': data.accountName,
      'Period Start': new Date(data.periodStart),
      'Period End': new Date(data.periodEnd),
      'Amount (€)': String(data.amount),
      'Invoice Date': data.invoiceDate ? new Date(data.invoiceDate) : null,
    }
    const result = await getMongo().collection('PaymentSchedules').insertOne(doc)
    invalidateCache()
    return result.insertedId.toHexString()
  },

  async updatePaymentSchedule(id: string, data: {
    periodStart?: string; periodEnd?: string; amount?: number; invoiceDate?: string | null
  }): Promise<boolean> {
    const update: Record<string, unknown> = {}
    if (data.periodStart !== undefined) update['Period Start'] = new Date(data.periodStart)
    if (data.periodEnd !== undefined) update['Period End'] = new Date(data.periodEnd)
    if (data.amount !== undefined) update['Amount (€)'] = String(data.amount)
    if (data.invoiceDate !== undefined) update['Invoice Date'] = data.invoiceDate ? new Date(data.invoiceDate) : null
    const result = await getMongo().collection('PaymentSchedules').updateOne(
      { _id: new ObjectId(id) }, { $set: update }
    )
    invalidateCache()
    return result.matchedCount === 1
  },

  async deletePaymentSchedule(id: string): Promise<boolean> {
    const result = await getMongo().collection('PaymentSchedules').deleteOne({ _id: new ObjectId(id) })
    invalidateCache()
    return result.deletedCount === 1
  },

  async deleteAccount(id: string): Promise<{ ok: boolean; name: string }> {
    const db = getMongo()
    const doc = await db.collection('Accounts').findOne({ _id: new ObjectId(id) })
    if (!doc) return { ok: false, name: id }
    const name: string = doc['Account Name']
    // Delete account first so a crash leaves orphaned children rather than a
    // child-less account document.
    const result = await db.collection('Accounts').deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 1) {
      await Promise.all([
        db.collection('Contacts').deleteMany({ 'Account Name': name }),
        db.collection('Subscriptions').deleteMany({ 'Account Name': name }),
        db.collection('Sales').deleteMany({ account_id: id }),
      ])
      invalidateCache()
    }
    return { ok: result.deletedCount === 1, name }
  },

  async getDeals(accountName: string): Promise<Deal[]> {
    const docs = await getMongo().collection('Deals')
      .find({ 'Account Name': accountName })
      .sort({ 'Created At': -1 })
      .toArray()
    return docs.map(docToDeal)
  },

  async getDeal(id: string): Promise<Deal | null> {
    try {
      const doc = await getMongo().collection('Deals').findOne({ _id: new ObjectId(id) })
      return doc ? docToDeal(doc) : null
    } catch { return null }
  },

  async createDeal(data: Parameters<typeof buildDealDoc>[0]): Promise<string> {
    const doc = { ...buildDealDoc(data), 'Created At': new Date() }
    const result = await getMongo().collection('Deals').insertOne(doc)
    return result.insertedId.toHexString()
  },

  async updateDeal(id: string, data: Parameters<typeof buildDealDoc>[0]): Promise<boolean> {
    const result = await getMongo().collection('Deals').updateOne(
      { _id: new ObjectId(id) },
      { $set: buildDealDoc(data) }
    )
    return result.matchedCount === 1
  },

  async deleteDeal(id: string): Promise<boolean> {
    const result = await getMongo().collection('Deals').deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount === 1
  },

  async getSales(search = '', page = 1, limit = 40, lisansTuru = ''): Promise<{ sales: Sale[]; total: number }> {
    const db = getMongo()
    const filter: Record<string, unknown> = {}
    if (lisansTuru) filter.lisans_turu = lisansTuru
    let docs = await db.collection('Sales').find(filter).sort({ created_at: -1 }).toArray()
    if (search) {
      const s = trNorm(search)
      docs = docs.filter(d => trNorm(d.firma_adi || '').includes(s))
    }
    const total = docs.length
    const start = (page - 1) * limit
    return { sales: docs.slice(start, start + limit).map(docToSale), total }
  },

  async getSale(id: string): Promise<Sale | null> {
    if (!ObjectId.isValid(id)) return null
    const doc = await getMongo().collection('Sales').findOne({ _id: new ObjectId(id) })
    return doc ? docToSale(doc) : null
  },

  async createSale(data: Record<string, unknown>, userEmail: string): Promise<string> {
    const doc = { ...data, created_at: new Date(), created_by: userEmail }
    const result = await getMongo().collection('Sales').insertOne(doc)
    return result.insertedId.toHexString()
  },

  async updateSale(id: string, data: Record<string, unknown>): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false
    const result = await getMongo().collection('Sales').updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    )
    return result.matchedCount === 1
  },

  async deleteSale(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false
    const result = await getMongo().collection('Sales').deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount === 1
  },

  async findAccountIdByName(name: string): Promise<string | null> {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const doc = await getMongo().collection('Accounts').findOne(
      { 'Account Name': { $regex: `^${escaped}$`, $options: 'i' } },
      { projection: { _id: 1 } }
    )
    return doc ? doc._id.toHexString() : null
  },

  async recomputeAccountArr(accountId: string): Promise<void> {
    const db = getMongo()
    const sales = await db.collection('Sales').find({ account_id: accountId }).toArray()
    const total = computeArrFromSales(sales)
    await db.collection('Accounts').updateOne(
      { _id: new ObjectId(accountId) },
      { $set: { 'ARR (€)': String(total) } }
    )
    invalidateCache()
  },

  async createAccount(data: {
    name: string; sector?: string; tier?: string; edition?: string
    licenseModel?: string; csm?: string; contractStart?: string; renewalDate?: string
    arr?: number; nps?: number | null; slaCompliance?: number | null; avgResolution?: string; notes?: string
    address?: string; partnerName?: string; partnerMargin?: number | null
    partnerLicensePrice?: number | null; currency?: string
    invoiceDate?: string; paymentTerms?: string; consultingDays?: string; trainingInfo?: string
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
      'Address': data.address || null,
      'Partner Name': data.partnerName || null,
      'Partner Margin %': data.partnerMargin ?? null,
      'Partner License Price (€)': data.partnerLicensePrice != null ? String(data.partnerLicensePrice) : null,
      'Currency': data.currency || null,
      'Invoice Date': data.invoiceDate ? new Date(data.invoiceDate) : null,
      'Payment Terms': data.paymentTerms || null,
      'Consulting Days': data.consultingDays || null,
      'Training Info': data.trainingInfo || null,
    }
    const result = await getMongo().collection('Accounts').insertOne(doc)
    invalidateCache()
    return result.insertedId.toHexString()
  },
}
