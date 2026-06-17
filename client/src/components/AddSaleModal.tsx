import { useState, useMemo, useEffect } from 'react'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { Sale, SalePeriod, Account, Contact, Product } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────
function addYears(iso: string, n: number): string {
  const d = new Date(iso)
  d.setFullYear(d.getFullYear() + n)
  return d.toISOString().split('T')[0]
}
function subDay(iso: string): string {
  const d = new Date(iso)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}
function fmtTR(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface SaleContact {
  existing_id: string | null
  name: string
  role: string
  contact_type: string
  email: string
}

interface Props {
  initialData?: Sale
  onClose: () => void
  onSaved: () => void
}

const CONTACT_TYPES = [
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'technical', label: 'Technical' },
  { value: 'business', label: 'Business' },
  { value: 'admin', label: 'Admin' },
  { value: 'financial', label: 'Financial' },
  { value: 'general', label: 'General' },
]

const EMPTY_CONTACT: SaleContact = { existing_id: null, name: '', role: '', contact_type: 'general', email: '' }

const EMPTY = {
  firma_adi: '', firma_adresi: '',
  contacts: [] as SaleContact[],
  lisans_turu: 'yeni' as 'yeni' | 'ek',
  yil_sayisi: '', musteri_liste_bedeli_yeni: '', indirimli_musteri_bedeli_yeni: '',
  musteri_liste_bedeli_ek: '', indirimli_musteri_bedeli_ek: '',
  taahhut_bitis_tarihi: '', kalan_ay: '', kalan_donem_net_tutar: '',
  urunler: {} as Record<string, string>,
  productPrices: {} as Record<string, { listPrice: string; unitPrice: string; hasDiscount: boolean; discountedPrice: string }>,
  partner: '', partner_marj: '', partner_lisans_bedeli: '', kur: '',
  fatura_tarihi: '', odeme_vadesi: '30 Gün',
  danismanlik_adam_gun: '', egitim: '', not: '',
}

// ── Field component ───────────────────────────────────────────────────────────
function Field({ label, required, half, children }: { label: string; required?: boolean; half?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${half ? 'flex-[0_0_calc(50%-6px)]' : 'flex-[1_1_100%]'}`}>
      <label className="text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">
        {label}{required && <span className="text-[var(--red)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'h-9 w-full rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] px-3 text-sm text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--blue)] transition-colors'
const selectCls = inputCls + ' appearance-none cursor-pointer'

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--brd)' }}>
      <div className="flex items-center gap-2 pb-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-[3px] h-4 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color }}>{label}</span>
      </div>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  )
}

// ── ContactRow ────────────────────────────────────────────────────────────────
function ContactRow({ index, contact, onUpdate, onRemove }: {
  index: number
  contact: SaleContact
  onUpdate: (update: Partial<SaleContact>) => void
  onRemove: () => void
}) {
  const [mode, setMode] = useState<'new' | 'existing'>(() => contact.existing_id ? 'existing' : 'new')
  const [search, setSearch] = useState(contact.existing_id ? contact.name : '')
  const [results, setResults] = useState<Contact[]>([])
  const [dropOpen, setDropOpen] = useState(false)
  const [dupeWarning, setDupeWarning] = useState<Contact | null>(null)

  useEffect(() => {
    if (mode !== 'existing' || contact.existing_id) {
      setResults([])
      setDropOpen(false)
      return
    }
    if (!search.trim()) {
      setResults([])
      setDropOpen(false)
      return
    }
    const t = setTimeout(() => {
      api.contacts.list({ search, limit: 8 })
        .then(d => { setResults(d.contacts); setDropOpen(d.contacts.length > 0) })
        .catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [search, mode, contact.existing_id])

  function selectExisting(c: Contact) {
    onUpdate({ existing_id: c.id, name: c.name, role: c.role || '', contact_type: c.contact_type || 'general', email: c.email || '' })
    setSearch(c.name)
    setDropOpen(false)
    setResults([])
    setDupeWarning(null)
  }

  function handleNameBlur() {
    if (mode !== 'new' || !contact.name.trim() || dupeWarning) return
    api.contacts.list({ search: contact.name, limit: 5 })
      .then(d => {
        const exact = d.contacts.find(c => c.name.toLowerCase() === contact.name.toLowerCase())
        if (exact) setDupeWarning(exact)
      })
      .catch(() => {})
  }

  function switchToExisting() {
    setMode('existing')
    onUpdate({ existing_id: null, name: '', role: '', email: '' })
    setSearch('')
    setDupeWarning(null)
  }

  function switchToNew() {
    setMode('new')
    onUpdate({ existing_id: null })
    setSearch('')
    setResults([])
    setDropOpen(false)
  }

  function clearExistingSelection() {
    onUpdate({ existing_id: null, name: '', role: '', email: '' })
    setSearch('')
  }

  return (
    <div className="rounded-[10px] p-3 flex flex-col gap-2" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Row header: label + mode toggle + remove */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--t4)]">Contact {index + 1}</span>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5 p-0.5 rounded-[6px]" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['existing', 'new'] as const).map(m => (
              <button
                key={m} type="button"
                onClick={() => m === 'existing' ? switchToExisting() : switchToNew()}
                className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold transition-all"
                style={mode === m
                  ? { background: 'rgba(96,165,250,0.2)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }
                  : { color: 'var(--t4)', border: '1px solid transparent' }}
              >{m === 'existing' ? 'Select Existing' : 'New'}</button>
            ))}
          </div>
          <button
            type="button" onClick={onRemove}
            className="w-5 h-5 rounded-[5px] flex items-center justify-center text-[var(--t4)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors text-xs"
          >✕</button>
        </div>
      </div>

      {/* Existing mode: search + dropdown */}
      {mode === 'existing' ? (
        <div className="relative">
          <input
            className={inputCls + ' w-full'}
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              if (contact.existing_id) clearExistingSelection()
            }}
            placeholder="Search contacts by name or role…"
            autoFocus={!contact.existing_id}
          />
          {contact.existing_id && (
            <button
              type="button"
              onClick={clearExistingSelection}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--t4)] hover:text-[var(--t1)] text-xs leading-none"
            >✕</button>
          )}
          {dropOpen && results.length > 0 && !contact.existing_id && (
            <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-[10px] overflow-hidden" style={{ background: 'var(--bg2)', border: '1px solid var(--brd)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              {results.map(c => (
                <button
                  key={c.id} type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => selectExisting(c)}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/[0.05] transition-colors"
                  style={{ borderBottom: '1px solid var(--brd)' }}
                >
                  <div className="text-sm text-[var(--t1)]">{c.name}</div>
                  <div className="text-[11px] text-[var(--t4)] mt-0.5">{[c.role, c.account_name || 'Unassigned'].filter(Boolean).join(' · ')}</div>
                </button>
              ))}
            </div>
          )}
          {contact.existing_id && (
            <div className="mt-1.5 px-2.5 py-1.5 rounded-[7px] text-[11px] font-semibold" style={{ background: 'rgba(96,165,250,0.08)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
              ✓ Linked{contact.role ? ` · ${contact.role}` : ''} · {contact.contact_type}
            </div>
          )}
        </div>
      ) : (
        /* New contact form */
        <>
          <div className="flex gap-2">
            <input
              className={inputCls + ' flex-1'} value={contact.name}
              onChange={e => { onUpdate({ name: e.target.value }); setDupeWarning(null) }}
              onBlur={handleNameBlur}
              placeholder="Name Surname"
            />
            <input
              className={inputCls + ' flex-1'} value={contact.role}
              onChange={e => onUpdate({ role: e.target.value })}
              placeholder="Title / Role"
            />
          </div>
          <div className="flex gap-2">
            <select
              className={selectCls + ' flex-1'} value={contact.contact_type}
              onChange={e => onUpdate({ contact_type: e.target.value })}
            >
              {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              type="email" className={inputCls + ' flex-1'} value={contact.email}
              onChange={e => onUpdate({ email: e.target.value })}
              placeholder="email@company.com"
            />
          </div>
          {dupeWarning && (
            <div className="rounded-[8px] px-3 py-2.5" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <p className="text-[11px] font-semibold mb-2" style={{ color: '#fbbf24' }}>
                "{dupeWarning.name}" already exists{dupeWarning.account_name ? ` (${dupeWarning.account_name})` : ''}.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { selectExisting(dupeWarning); setMode('existing') }}
                  className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors"
                  style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}
                >Link existing</button>
                <button
                  type="button"
                  onClick={() => setDupeWarning(null)}
                  className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--t3)', border: '1px solid var(--brd)' }}
                >Create new anyway</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AddSaleModal({ initialData, onClose, onSaved }: Props) {
  const isEdit = !!initialData
  const [form, setForm] = useState<typeof EMPTY>(() => {
    if (!initialData) return { ...EMPTY }
    const s = (v: string | null | undefined) => v ?? ''
    let contacts: SaleContact[] = []
    if (Array.isArray(initialData.contacts) && initialData.contacts.length > 0) {
      contacts = initialData.contacts.map(c => ({ existing_id: null, name: c.name, role: c.role, contact_type: c.contact_type, email: c.email }))
    } else {
      if (initialData.kontak_adi) contacts.push({ existing_id: null, name: s(initialData.kontak_adi), role: s(initialData.kontak_gorevi), contact_type: 'general', email: s(initialData.kontak_email) })
      if (initialData.finans_kontak_adi) contacts.push({ existing_id: null, name: s(initialData.finans_kontak_adi), role: s(initialData.finans_kontak_gorevi), contact_type: 'financial', email: s(initialData.finans_kontak_email) })
    }
    return {
      firma_adi: s(initialData.firma_adi),
      firma_adresi: s(initialData.firma_adresi),
      contacts,
      lisans_turu: initialData.lisans_turu || 'yeni',
      yil_sayisi: s(initialData.yil_sayisi),
      musteri_liste_bedeli_yeni: s(initialData.musteri_liste_bedeli_yeni),
      indirimli_musteri_bedeli_yeni: s(initialData.indirimli_musteri_bedeli_yeni),
      musteri_liste_bedeli_ek: s(initialData.musteri_liste_bedeli_ek),
      indirimli_musteri_bedeli_ek: s(initialData.indirimli_musteri_bedeli_ek),
      taahhut_bitis_tarihi: s(initialData.taahhut_bitis_tarihi),
      kalan_ay: s(initialData.kalan_ay),
      kalan_donem_net_tutar: s(initialData.kalan_donem_net_tutar),
      urunler: initialData.urunler || {},
      productPrices: {},
      partner: s(initialData.partner),
      partner_marj: s(initialData.partner_marj),
      partner_lisans_bedeli: s(initialData.partner_lisans_bedeli),
      kur: s(initialData.kur),
      fatura_tarihi: s(initialData.fatura_tarihi),
      odeme_vadesi: s(initialData.odeme_vadesi) || '30 Gün',
      danismanlik_adam_gun: s(initialData.danismanlik_adam_gun),
      egitim: s(initialData.egitim),
      not: s(initialData.not),
    }
  })
  const [accountMode, setAccountMode] = useState<'existing' | 'new'>(() =>
    !!initialData?.account_id ? 'existing' : 'new'
  )
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    initialData?.account_id ?? null
  )
  const [accountSearch, setAccountSearch] = useState(() =>
    initialData?.account_id ? (initialData.firma_adi ?? '') : ''
  )
  const [accountResults, setAccountResults] = useState<Account[]>([])
  const [accountDropOpen, setAccountDropOpen] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [productTab, setProductTab] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.products.list().then(d => {
      setProducts(d.products)
      if (!productTab && d.products.length > 0) setProductTab(d.products[0].product_group)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (accountMode !== 'existing' || selectedAccountId || !accountSearch.trim()) {
      setAccountResults([])
      setAccountDropOpen(false)
      return
    }
    const t = setTimeout(() => {
      api.accounts.list({ search: accountSearch, limit: 8 } as Parameters<typeof api.accounts.list>[0])
        .then(d => { setAccountResults(d.accounts); setAccountDropOpen(d.accounts.length > 0) })
        .catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [accountSearch, accountMode, selectedAccountId])

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))
  const setUrun = (name: string, val: string) => setForm(f => ({ ...f, urunler: { ...f.urunler, [name]: val } }))
  type PriceEntry = { listPrice: string; unitPrice: string; hasDiscount: boolean; discountedPrice: string }

  function setProductField(name: string, field: keyof PriceEntry, val: string | boolean) {
    setForm(f => {
      const cur: PriceEntry = f.productPrices[name] ?? { listPrice: '', unitPrice: '', hasDiscount: false, discountedPrice: '' }
      let next = { ...cur, [field]: val }
      if (field === 'hasDiscount') {
        if (val) { next.discountedPrice = cur.unitPrice }
        else { next.unitPrice = cur.listPrice; next.discountedPrice = '' }
      }
      if (field === 'discountedPrice') next.unitPrice = val as string
      if (field === 'listPrice' && !cur.hasDiscount) next.unitPrice = val as string
      return { ...f, productPrices: { ...f.productPrices, [name]: next } }
    })
  }

  function toggleProduct(p: Product) {
    const hasQty = parseInt(form.urunler[p.name] || '0') > 0
    setForm(f => ({
      ...f,
      urunler: { ...f.urunler, [p.name]: hasQty ? '0' : '1' },
      productPrices: hasQty ? f.productPrices : {
        ...f.productPrices,
        [p.name]: f.productPrices[p.name] ?? { listPrice: String(p.list_price || ''), unitPrice: String(p.list_price || ''), hasDiscount: false, discountedPrice: '' },
      },
    }))
  }

  const addContact = () => setForm(f => ({ ...f, contacts: [...f.contacts, { ...EMPTY_CONTACT }] }))
  const removeContact = (i: number) => setForm(f => ({ ...f, contacts: f.contacts.filter((_, idx) => idx !== i) }))
  const updateContact = (i: number, update: Partial<SaleContact>) =>
    setForm(f => ({ ...f, contacts: f.contacts.map((c, idx) => idx === i ? { ...c, ...update } : c) }))

  const allSelected = Object.entries(form.urunler).filter(([, v]) => parseInt(v) > 0)

  const computedAnnualTotal = useMemo(() =>
    allSelected.reduce((sum, [name, qty]) => {
      const price = parseFloat(form.productPrices[name]?.unitPrice || '0') || 0
      return sum + (parseInt(qty) || 0) * price
    }, 0)
  , [allSelected, form.productPrices])

  const computedListTotal = useMemo(() =>
    allSelected.reduce((sum, [name, qty]) => {
      const price = parseFloat(form.productPrices[name]?.listPrice || '0') || 0
      return sum + (parseInt(qty) || 0) * price
    }, 0)
  , [allSelected, form.productPrices])

  const periods: SalePeriod[] = useMemo(() => {
    if (form.lisans_turu !== 'yeni' || !form.fatura_tarihi || !form.yil_sayisi) return []
    const n = parseInt(form.yil_sayisi) || 0
    const tutar = computedAnnualTotal > 0 ? String(computedAnnualTotal) : ''
    return Array.from({ length: n }, (_, i) => ({
      baslangic: addYears(form.fatura_tarihi, i),
      bitis: subDay(addYears(form.fatura_tarihi, i + 1)),
      tutar,
    }))
  }, [form.lisans_turu, form.fatura_tarihi, form.yil_sayisi, computedAnnualTotal])

  const productGroups = [...new Set(products.map(p => p.product_group).filter(Boolean))]
  const activeProducts = products.filter(p => p.product_group === productTab)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (accountMode === 'existing' && !selectedAccountId) { toast.error('Please select an existing account from the dropdown'); return }
    if (accountMode === 'new' && !form.firma_adi.trim()) { toast.error('Company name is required'); return }
    setSaving(true)
    try {
      const totalStr = computedAnnualTotal > 0 ? String(computedAnnualTotal) : ''
      const listStr = computedListTotal > 0 ? String(computedListTotal) : ''
      const payload = {
        ...form,
        musteri_liste_bedeli_yeni: listStr,
        indirimli_musteri_bedeli_yeni: totalStr,
        musteri_liste_bedeli_ek: listStr,
        indirimli_musteri_bedeli_ek: totalStr,
        urunler_fiyatlari: form.productPrices,
        lisans_periodlari: periods.length > 0 ? periods : null,
        ...(accountMode === 'existing' && selectedAccountId ? { account_id: selectedAccountId } : {}),
      }
      if (isEdit) {
        await api.sales.update(initialData!.id, payload)
        toast.success('Sale updated')
      } else {
        await api.sales.create(payload)
        toast.success('Sale created')
      }
      onSaved()
    } catch {
      toast.error('Failed to save sale')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative ml-auto h-full flex flex-col"
        style={{ width: 'min(100vw, 1020px)', background: 'var(--bg2)', borderLeft: '1px solid rgba(91,158,255,0.10)', boxShadow: '-12px 0 60px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--brd)', background: 'rgba(17,31,50,0.85)' }}>
          <div className="flex items-center gap-3">
            <div className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, #059669, #0ea5e9)' }}>◈</div>
            <div>
              <h2 className="text-sm font-bold text-[var(--t1)]">{isEdit ? 'Edit Sale' : 'New Sale'}</h2>
              <p className="text-[11px] text-[var(--t4)]">{isEdit ? form.firma_adi : 'Create a new sales record'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--bg3)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 350px', alignItems: 'start' }}>

            {/* ── Left: form sections ─────────────────────────────────── */}
            <div className="flex flex-col gap-4">

              <Section label="Company Info" color="#10b981">
                {/* Account mode toggle */}
                <Field label="Account">
                  <div className="flex gap-1 p-0.5 rounded-[8px]" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {(['existing', 'new'] as const).map(m => (
                      <button
                        key={m} type="button"
                        onClick={() => {
                          setAccountMode(m)
                          if (m === 'new') { setSelectedAccountId(null); setAccountSearch(''); set('lisans_turu', 'yeni') }
                        }}
                        className="flex-1 px-3 py-1 rounded-[6px] text-xs font-semibold transition-all"
                        style={accountMode === m
                          ? { background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                          : { color: 'var(--t4)', border: '1px solid transparent' }}
                      >{m === 'existing' ? 'Existing Account' : 'New Account'}</button>
                    ))}
                  </div>
                </Field>

                {accountMode === 'existing' ? (
                  <Field label="Search Account" required>
                    <div className="relative">
                      <input
                        className={inputCls}
                        value={accountSearch}
                        onChange={e => { setAccountSearch(e.target.value); setSelectedAccountId(null) }}
                        placeholder="Start typing account name…"
                        autoComplete="off"
                      />
                      {selectedAccountId && (
                        <button
                          type="button"
                          onClick={() => { setSelectedAccountId(null); setAccountSearch('') }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--t4)] hover:text-[var(--t1)] text-xs leading-none"
                        >✕</button>
                      )}
                      {accountDropOpen && accountResults.length > 0 && (
                        <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-[10px] overflow-hidden" style={{ background: 'var(--bg2)', border: '1px solid var(--brd)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                          {accountResults.map(a => (
                            <button
                              key={a.id} type="button"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => {
                                setSelectedAccountId(a.id)
                                setForm(f => ({ ...f, firma_adi: a.name, firma_adresi: a.address ?? '' }))
                                setAccountSearch(a.name)
                                setAccountDropOpen(false)
                                setAccountResults([])
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-white/[0.05] transition-colors"
                              style={{ borderBottom: '1px solid var(--brd)' }}
                            >
                              <div className="text-sm text-[var(--t1)]">{a.name}</div>
                              {a.address && <div className="text-[11px] text-[var(--t4)] truncate mt-0.5">{a.address}</div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedAccountId && (
                      <div className="mt-1.5 px-2.5 py-1.5 rounded-[7px] text-[11px] font-semibold" style={{ background: 'rgba(16,185,129,0.08)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                        ✓ Linked to existing account
                      </div>
                    )}
                  </Field>
                ) : (
                  <Field label="Company Name" required>
                    <input className={inputCls} value={form.firma_adi} onChange={e => set('firma_adi', e.target.value)} placeholder="İstanbul Nişantaşı Üniversitesi" />
                  </Field>
                )}
                <Field label="Address">
                  {accountMode === 'existing' && selectedAccountId ? (
                    <div className="w-full rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)]/50 px-3 py-2 text-sm text-[var(--t3)] min-h-[62px] leading-relaxed" style={{ cursor: 'default' }}>
                      {form.firma_adresi || <span className="text-[var(--t4)] italic">No address on record</span>}
                    </div>
                  ) : (
                    <textarea
                      className="w-full rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--blue)] transition-colors resize-none"
                      value={form.firma_adresi} onChange={e => set('firma_adresi', e.target.value)}
                      placeholder="Maslak Mahallesi…" rows={2}
                    />
                  )}
                </Field>

                {/* Dynamic contacts */}
                <div className="flex-[1_1_100%] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--t4)]">Contacts</span>
                    <button
                      type="button" onClick={addContact}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-[11px] font-semibold transition-colors"
                      style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}
                    >+ Add Contact</button>
                  </div>
                  {form.contacts.length === 0 && (
                    <div className="text-[11px] text-center py-3 rounded-[8px] text-[var(--t4)]"
                      style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                      No contacts yet — click Add Contact
                    </div>
                  )}
                  {form.contacts.map((c, i) => (
                    <ContactRow
                      key={i}
                      index={i}
                      contact={c}
                      onUpdate={update => updateContact(i, update)}
                      onRemove={() => removeContact(i)}
                    />
                  ))}
                </div>
              </Section>

              {/* License section */}
              <div className="rounded-[12px] p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--brd)' }}>
                <div className="flex items-center justify-between pb-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-[3px] h-4 rounded-full" style={{ background: '#f59e0b' }} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#f59e0b' }}>License</span>
                  </div>
                  <div className="flex gap-1 p-0.5 rounded-[8px]" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {([['yeni', 'New License'], ['ek', 'Add-on License']] as [string, string][]).map(([v, l]) => (
                      <button
                        key={v} type="button"
                        onClick={() => set('lisans_turu', v)}
                        disabled={v === 'ek' && accountMode === 'new'}
                        title={v === 'ek' && accountMode === 'new' ? 'Add-on requires an existing account' : undefined}
                        className="px-3 py-1 rounded-[6px] text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        style={form.lisans_turu === v
                          ? { background: v === 'yeni' ? 'rgba(5,150,105,0.3)' : 'rgba(14,165,233,0.25)', color: v === 'yeni' ? '#34d399' : '#38bdf8', border: `1px solid ${v === 'yeni' ? 'rgba(5,150,105,0.4)' : 'rgba(14,165,233,0.3)'}` }
                          : { color: 'var(--t4)', border: '1px solid transparent' }}
                      >{l}</button>
                    ))}
                  </div>
                </div>

                {form.lisans_turu === 'yeni' ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">Subscription Term (Years)</label>
                      <input
                        type="number" className={inputCls} value={form.yil_sayisi}
                        onChange={e => set('yil_sayisi', e.target.value)} placeholder="3"
                      />
                    </div>
                    <div className="flex items-center justify-between h-10 px-4 rounded-[10px]" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs text-[var(--t4)]">List Total</span>
                      <span className="text-sm font-mono text-[var(--t2)]">{computedListTotal > 0 ? `€${computedListTotal.toLocaleString('de-DE')}` : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between h-12 px-4 rounded-[10px]" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="text-sm text-[var(--t3)]">Annual Total</span>
                      <span className="text-base font-bold font-mono" style={{ color: computedAnnualTotal > 0 ? '#34d399' : 'var(--t4)' }}>
                        {computedAnnualTotal > 0 ? `€${computedAnnualTotal.toLocaleString('de-DE')}` : '—'}
                      </span>
                    </div>
                    {periods.length > 0 ? (
                      <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)' }}>
                          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--t4)]">Payment Schedule Preview</span>
                          <span className="text-[10px] font-bold text-[var(--t4)]">{periods.length} yr</span>
                        </div>
                        {periods.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-4 py-3"
                            style={{ borderBottom: i < periods.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: 'rgba(0,0,0,0.15)' }}
                          >
                            <span className="text-sm font-mono" style={{ color: '#60a5fa' }}>{fmtTR(p.baslangic)} – {fmtTR(p.bitis)}</span>
                            <span className="text-sm font-mono font-semibold text-[var(--t1)]">{p.tutar || '—'}</span>
                          </div>
                        ))}
                      </div>
                    ) : form.yil_sayisi && !form.fatura_tarihi ? (
                      <div className="text-[11px] text-center py-2.5 rounded-[8px] text-[var(--t4)]" style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                        Set invoice date to generate schedule
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Field label="List Total" half>
                      <div className="h-9 flex items-center px-3 rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)]/50 text-sm font-mono text-[var(--t2)]">
                        {computedListTotal > 0 ? `€${computedListTotal.toLocaleString('de-DE')}` : '—'}
                      </div>
                    </Field>
                    <Field label="Annual Total" half>
                      <div className="h-9 flex items-center px-3 rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)]/50 text-sm font-mono font-bold" style={{ color: computedAnnualTotal > 0 ? '#34d399' : 'var(--t4)' }}>
                        {computedAnnualTotal > 0 ? `€${computedAnnualTotal.toLocaleString('de-DE')}` : '—'}
                      </div>
                    </Field>
                    <Field label="Commitment End Date" half>
                      <input type="date" className={inputCls} value={form.taahhut_bitis_tarihi} onChange={e => set('taahhut_bitis_tarihi', e.target.value)} />
                    </Field>
                    <Field label="Remaining Months" half>
                      <input type="number" className={inputCls} value={form.kalan_ay} onChange={e => set('kalan_ay', e.target.value)} placeholder="12" />
                    </Field>
                    <Field label="Remaining Period Net Price">
                      <input className={inputCls} value={form.kalan_donem_net_tutar} onChange={e => set('kalan_donem_net_tutar', e.target.value)} placeholder="0,00 €" />
                    </Field>
                  </div>
                )}
              </div>

              <Section label="Partner Info" color="#60a5fa">
                <Field label="Partner" half>
                  <input className={inputCls} value={form.partner} onChange={e => set('partner', e.target.value)} placeholder="BI Technology" />
                </Field>
                <Field label="Partner Margin (%)" half>
                  <input className={inputCls} value={form.partner_marj} onChange={e => set('partner_marj', e.target.value)} placeholder="20%" />
                </Field>
                <Field label="Partner License Price" half>
                  <input className={inputCls} value={form.partner_lisans_bedeli} onChange={e => set('partner_lisans_bedeli', e.target.value)} placeholder="0,00 €" />
                </Field>
                <Field label="Rate (EUR/TRY)" half>
                  <input className={inputCls} value={form.kur} onChange={e => set('kur', e.target.value)} placeholder="38,50" />
                </Field>
              </Section>

              <Section label="Invoice" color="#a78bfa">
                <Field label="Invoice Date" half>
                  <input type="date" className={inputCls} value={form.fatura_tarihi} onChange={e => set('fatura_tarihi', e.target.value)} />
                </Field>
                <Field label="Payment Terms" half>
                  <select className={selectCls} value={form.odeme_vadesi} onChange={e => set('odeme_vadesi', e.target.value)}>
                    {['15 Gün', '30 Gün', '45 Gün', '60 Gün', '90 Gün', 'Peşin'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </Section>

              <Section label="Additional Info" color="#f472b6">
                <Field label="Consulting (Man/Day)" half>
                  <input className={inputCls} value={form.danismanlik_adam_gun} onChange={e => set('danismanlik_adam_gun', e.target.value)} placeholder="5" />
                </Field>
                <Field label="Training" half>
                  <input className={inputCls} value={form.egitim} onChange={e => set('egitim', e.target.value)} placeholder="Free for 2 people" />
                </Field>
                <Field label="Notes">
                  <textarea
                    className="w-full rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--blue)] transition-colors resize-none"
                    value={form.not} onChange={e => set('not', e.target.value)}
                    placeholder="Optional notes…" rows={3}
                  />
                </Field>
              </Section>

            </div>

            {/* ── Right: products (sticky) ─────────────────────────────── */}
            <div style={{ position: 'sticky', top: 0 }}>
              <div className="rounded-[12px] p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--brd)' }}>
                <div className="flex items-center gap-2 pb-2.5 mb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-[3px] h-4 rounded-full" style={{ background: '#f59e0b' }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#f59e0b' }}>Products</span>
                </div>

                {productGroups.length > 0 && (
                  <div className="flex gap-1 p-0.5 rounded-[8px] mb-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {productGroups.map(g => (
                      <button
                        key={g} type="button" onClick={() => setProductTab(g)}
                        className="flex-1 text-center py-1.5 rounded-[6px] text-[11px] font-semibold transition-all"
                        style={productTab === g
                          ? { background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.35)' }
                          : { color: 'var(--t4)', border: '1px solid transparent' }}
                      >{g}</button>
                    ))}
                  </div>
                )}

                {allSelected.length > 0 && (
                  <div className="mb-3 p-2.5 rounded-[8px]" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: '#92400e' }}>
                      Selected ({allSelected.length})
                    </div>
                    {allSelected.map(([name, qty]) => (
                      <div key={name} className="flex justify-between text-[11px] mb-1">
                        <span className="truncate flex-1 mr-2" style={{ color: '#fcd34d' }}>{name}</span>
                        <span className="font-mono flex-shrink-0" style={{ color: '#fbbf24' }}>× {qty}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 440 }}>
                  {products.length === 0 && (
                    <div className="text-center py-8 text-[11px] text-[var(--t4)]">Loading products…</div>
                  )}
                  {activeProducts.map(p => {
                    const qty = form.urunler[p.name] || ''
                    const hasQty = !!(qty && qty !== '0')
                    const pp = form.productPrices[p.name]
                    const listPrice = pp?.listPrice || ''
                    const hasDiscount = pp?.hasDiscount || false
                    const discountedPrice = pp?.discountedPrice || ''
                    const listNum = parseFloat(listPrice) || 0
                    const discNum = parseFloat(discountedPrice) || 0
                    const discPct = hasDiscount && listNum > 0 && discNum > 0 && discNum < listNum
                      ? Math.round((1 - discNum / listNum) * 1000) / 10
                      : null
                    return (
                      <div key={p.id} className="flex flex-col gap-1 px-2.5 py-2 rounded-[8px] transition-all"
                        style={{ background: hasQty ? 'rgba(245,158,11,0.07)' : 'transparent', border: `1px solid ${hasQty ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.04)'}` }}>
                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => toggleProduct(p)}>
                          <span className="flex-1 text-[11px] leading-snug min-w-0 truncate" style={{ color: hasQty ? '#fde68a' : 'var(--t4)' }}>{p.name}</span>
                          <input
                            type="number" min="0" value={qty}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setUrun(p.name, e.target.value)}
                            placeholder="—"
                            className="w-10 rounded-[6px] text-center text-xs font-mono focus:outline-none flex-shrink-0"
                            style={{ background: hasQty ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.3)', border: `1px solid ${hasQty ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.07)'}`, color: hasQty ? '#fbbf24' : 'var(--t4)', padding: '3px 0' }}
                          />
                        </div>
                        {hasQty && (
                          <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number" min="0" value={listPrice}
                                onChange={e => setProductField(p.name, 'listPrice', e.target.value)}
                                placeholder="List €"
                                className="flex-1 rounded-[6px] text-center text-xs font-mono focus:outline-none"
                                style={{
                                  background: 'rgba(0,0,0,0.25)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: hasDiscount ? 'var(--t4)' : '#34d399',
                                  padding: '3px 0',
                                  textDecoration: hasDiscount ? 'line-through' : 'none',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setProductField(p.name, 'hasDiscount', !hasDiscount)}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] flex-shrink-0 transition-all"
                                style={hasDiscount
                                  ? { background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }
                                  : { background: 'rgba(255,255,255,0.05)', color: 'var(--t4)', border: '1px solid rgba(255,255,255,0.08)' }}
                              >İndirim</button>
                            </div>
                            {hasDiscount && (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number" min="0" value={discountedPrice}
                                  onChange={e => setProductField(p.name, 'discountedPrice', e.target.value)}
                                  placeholder="İndirimli €"
                                  className="flex-1 rounded-[6px] text-center text-xs font-mono font-bold focus:outline-none"
                                  style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399', padding: '4px 0' }}
                                />
                                {discPct !== null && (
                                  <span className="text-[11px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded-[4px]" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                                    -{discPct}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--brd)', background: 'rgba(17,31,50,0.7)' }}>
          <button type="button" onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm rounded-[10px] text-[var(--t3)] hover:text-[var(--t1)] transition-colors disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--brd)' }}
          >Cancel</button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 text-sm font-semibold rounded-[10px] text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #059669, #0ea5e9)' }}
          >{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Sale'}</button>
        </div>
      </form>
    </div>
  )
}
