import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { fmtCurrency } from '@/lib/utils'
import type { Account, Product, SubscriptionDetail } from '@/types'

interface Props {
  onClose: () => void
  onCreated: () => void
  prefilledAccount?: { id: string; name: string }
  initialData?: SubscriptionDetail
}

const selectClass = 'h-9 w-full rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] px-3 text-sm text-[var(--t1)] focus:outline-none focus:border-[var(--blue)] transition-colors appearance-none cursor-pointer'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">
        {label}{required && <span className="text-[var(--red)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function fmtDateTR(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function autoGeneratePeriods(
  startDate: string,
  years: number,
  annualAmount: number,
  originalAnnualAmount?: number | null,
) {
  return Array.from({ length: years }, (_, i) => {
    const pStart = new Date(startDate)
    pStart.setFullYear(pStart.getFullYear() + i)
    const pEnd = new Date(pStart)
    pEnd.setFullYear(pEnd.getFullYear() + 1)
    pEnd.setDate(pEnd.getDate() - 1)
    return {
      periodStart: pStart.toISOString().slice(0, 10),
      periodEnd: pEnd.toISOString().slice(0, 10),
      amount: annualAmount,
      originalAmount: originalAnnualAmount ?? null,
    }
  })
}

const CATEGORIES = ['Analytics', 'Data'] as const
type ProductCategory = typeof CATEGORIES[number]

function getProductCategory(name: string): ProductCategory {
  if (name.includes('Data Integration') || name.includes('Talend')) return 'Data'
  return 'Analytics'
}

export default function AddSubscriptionModal({ onClose, onCreated, prefilledAccount, initialData }: Props) {
  const isEdit = !!initialData
  const [accounts, setAccounts] = useState<Account[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [productCategory, setProductCategory] = useState<ProductCategory | ''>('')
  const [form, setForm] = useState({
    accountName: initialData?.account_name || prefilledAccount?.name || '',
    productId: '',
    quantity: initialData ? String(initialData.quantity) : '1',
    invoiceDate: initialData?.invoice_date || '',
    subscriptionYears: '',
    unitPriceOverride: initialData?.list_price != null ? String(initialData.list_price) : '',
    discountedUnitPrice: '',
    hasDiscount: false,
    notes: '',
  })

  useEffect(() => {
    api.products.list().then(d => {
      setProducts(d.products)
      if (initialData) {
        const match = d.products.find(p => p.name === initialData.product_name)
        if (match) setForm(f => ({ ...f, productId: match.id, unitPriceOverride: String(match.list_price) }))
      }
    }).catch(console.error)

    if (!prefilledAccount && !isEdit) {
      api.accounts.list({ limit: 999 }).then(d => setAccounts(d.accounts)).catch(console.error)
    }
  }, [])

  const filteredProducts = productCategory
    ? products.filter(p => getProductCategory(p.name) === productCategory)
    : products

  const selectedProduct = products.find(p => p.id === form.productId)
  const catalogPrice = selectedProduct?.list_price ?? initialData?.list_price ?? null

  function set(field: string, value: string) {
    if (field === 'productId') {
      const prod = products.find(p => p.id === value)
      setForm(f => ({
        ...f,
        productId: value,
        unitPriceOverride: prod ? String(prod.list_price) : '',
        hasDiscount: false,
        discountedUnitPrice: '',
      }))
      return
    }
    setForm(f => ({ ...f, [field]: value }))
  }

  const qty = Number(form.quantity) || 0
  const unitPriceNum = Number(form.unitPriceOverride) || 0
  const discountedNum = form.hasDiscount && form.discountedUnitPrice ? Number(form.discountedUnitPrice) : null
  const effectiveUnitPrice = discountedNum != null ? discountedNum : unitPriceNum
  const annualTotal = qty > 0 && effectiveUnitPrice > 0 ? qty * effectiveUnitPrice : null
  const annualOriginal = form.hasDiscount && unitPriceNum > 0 ? qty * unitPriceNum : null
  const discountPctVal = form.hasDiscount && unitPriceNum > 0 && discountedNum != null && discountedNum < unitPriceNum
    ? Math.round((1 - discountedNum / unitPriceNum) * 1000) / 10
    : null

  const previewYears = !isEdit ? (parseInt(form.subscriptionYears) || 0) : 0
  const previewPeriods = !isEdit && form.invoiceDate && previewYears > 0 && annualTotal != null
    ? autoGeneratePeriods(form.invoiceDate, previewYears, annualTotal, annualOriginal)
    : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.accountName) { setError('Account is required'); return }
    if (!isEdit && !productCategory) { setError('Category is required'); return }
    if (!form.productId && !isEdit) { setError('Product is required'); return }
    if (!form.quantity) { setError('Quantity is required'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.subscriptions.update(initialData!.id, {
          productName: selectedProduct?.name || initialData!.product_name,
          category: selectedProduct?.category || initialData!.category,
          productGroup: selectedProduct?.product_group || initialData!.product_group,
          quantity: qty,
          unit: selectedProduct?.unit_type || initialData!.unit_label,
          listPrice: unitPriceNum || (catalogPrice ?? 0),
          unitPrice: unitPriceNum || (catalogPrice ?? 0),
          invoiceDate: form.invoiceDate || null,
        })
        toast.success('Subscription updated')
      } else {
        await api.subscriptions.create({
          accountName: form.accountName,
          productName: selectedProduct?.name || '',
          category: selectedProduct?.category || '',
          productGroup: selectedProduct?.product_group || '',
          quantity: qty,
          unit: selectedProduct?.unit_type || '',
          listPrice: unitPriceNum,
          unitPrice: effectiveUnitPrice,
          invoiceDate: form.invoiceDate || undefined,
          notes: form.notes || undefined,
          subscriptionYears: previewYears || null,
          paymentPeriods: previewPeriods.length > 0 ? previewPeriods : null,
        })
        toast.success('Subscription added')
      }
      onCreated()
    } catch (err) {
      toast.error('Failed to save subscription')
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative ml-auto h-full w-full max-w-full sm:max-w-[480px] bg-[var(--bg2)] border-l border-[var(--brd)] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--brd)]">
          <div>
            <h2 className="text-base font-bold text-[var(--t1)]">{isEdit ? 'Edit Subscription' : 'New Subscription'}</h2>
            <p className="text-xs text-[var(--t4)] mt-0.5">
              {isEdit
                ? `Editing ${initialData!.product_name}`
                : prefilledAccount
                  ? `Adding to ${prefilledAccount.name}`
                  : 'Add a product subscription'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--bg3)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <Field label="Account" required>
            {isEdit || prefilledAccount ? (
              <div className="h-9 flex items-center px-3 rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)]/50 text-sm text-[var(--t2)]">
                {form.accountName}
              </div>
            ) : (
              <select className={selectClass} value={form.accountName} onChange={e => set('accountName', e.target.value)}>
                <option value="">— Select account —</option>
                {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            )}
          </Field>

          {!isEdit && (
            <Field label="Category" required>
              <select
                className={selectClass}
                value={productCategory}
                onChange={e => {
                  setProductCategory(e.target.value as ProductCategory | '')
                  setForm(f => ({ ...f, productId: '', unitPriceOverride: '', hasDiscount: false, discountedUnitPrice: '' }))
                }}
              >
                <option value="">— Select category —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          )}

          <Field label="Product" required={!isEdit}>
            {isEdit ? (
              <div className="h-9 flex items-center px-3 rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)]/50 text-sm text-[var(--t2)]">
                {initialData!.product_name}
              </div>
            ) : (
              <select
                className={selectClass}
                value={form.productId}
                onChange={e => set('productId', e.target.value)}
                disabled={!productCategory}
              >
                <option value="">— {productCategory ? 'Select product' : 'Select a category first'} —</option>
                {filteredProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.product_group}</option>
                ))}
              </select>
            )}
          </Field>

          {/* Product metadata */}
          {(selectedProduct || (isEdit && catalogPrice != null)) && (
            <div className="text-xs text-[var(--t4)] px-1 flex items-center justify-between">
              <span>
                {selectedProduct
                  ? `${selectedProduct.category} · ${selectedProduct.product_group} · ${selectedProduct.unit_type}`
                  : `${initialData!.category} · ${initialData!.product_group}`}
              </span>
              {catalogPrice != null && !isEdit && (
                <span className="font-mono text-[var(--t4)]">Catalog: {fmtCurrency(catalogPrice)} / unit</span>
              )}
            </div>
          )}

          {/* Editable unit price + optional discount (create mode only) */}
          {!isEdit && (selectedProduct || form.unitPriceOverride) && (
            <div className="rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] px-3 py-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 items-end">
                <Field label="Unit Price (€)">
                  <Input
                    type="number" min="0"
                    value={form.unitPriceOverride}
                    onChange={e => set('unitPriceOverride', e.target.value)}
                    className="h-9 text-right font-mono"
                  />
                </Field>
                {form.hasDiscount && (
                  <Field label="Discounted Unit Price (€)">
                    <div className="relative">
                      <Input
                        type="number" min="0"
                        value={form.discountedUnitPrice}
                        onChange={e => set('discountedUnitPrice', e.target.value)}
                        className="h-9 text-right font-mono pr-14"
                        autoFocus
                      />
                      {discountPctVal !== null && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-[4px] pointer-events-none"
                          style={{ background: 'rgba(247,170,40,0.12)', color: '#f7aa28' }}>
                          -%{discountPctVal}
                        </span>
                      )}
                    </div>
                  </Field>
                )}
              </div>
              {form.hasDiscount ? (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, hasDiscount: false, discountedUnitPrice: '' }))}
                  className="text-[11px] text-[var(--t4)] hover:text-[var(--red)] transition-colors"
                >
                  Remove discount
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, hasDiscount: true }))}
                  className="text-[11px] text-[var(--blue)] hover:underline font-semibold"
                >
                  + Add discounted price
                </button>
              )}
            </div>
          )}

          {/* Edit mode: read-only price info */}
          {isEdit && catalogPrice != null && (
            <div className="rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] px-3 py-2.5 flex items-center justify-end">
              <span className="text-sm font-mono font-semibold text-[var(--t2)] flex-shrink-0">
                {fmtCurrency(catalogPrice)}
                <span className="text-[10px] text-[var(--t4)] ml-1 font-normal">/ unit</span>
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" required>
              <Input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} autoFocus={!isEdit && !!prefilledAccount} />
            </Field>
            <Field label="Invoice Date">
              <Input type="date" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} />
            </Field>
          </div>

          {!isEdit && (
            <Field label="Subscription Term (Years)">
              <Input
                type="number" min="1" max="10"
                value={form.subscriptionYears}
                onChange={e => set('subscriptionYears', e.target.value)}
                placeholder="e.g. 3"
              />
            </Field>
          )}

          {/* Yıllık Tutar */}
          {annualTotal != null && annualTotal > 0 && (
            <div className="flex justify-between items-center px-3 py-2.5 bg-[var(--green)]/10 border border-[var(--green)]/20 rounded-[10px]">
              <span className="text-xs text-[var(--t3)]">Annual Total</span>
              <div className="flex items-center gap-2">
                {form.hasDiscount && annualOriginal != null && annualOriginal > annualTotal && (
                  <span className="text-xs font-mono text-[var(--t4)] line-through">{fmtCurrency(annualOriginal)}</span>
                )}
                <span className="text-sm font-bold font-mono text-[var(--green)]">{fmtCurrency(annualTotal)}</span>
                {discountPctVal !== null && (
                  <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-[4px]"
                    style={{ background: 'rgba(247,170,40,0.12)', color: '#f7aa28' }}>
                    -%{discountPctVal}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Period preview */}
          {previewPeriods.length > 0 && (
            <div className="rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] overflow-hidden">
              <div className="px-3 py-2 border-b border-[var(--brd)] flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.6px] text-[var(--t4)]">
                  Payment Schedule Preview
                </span>
                <span className="text-[10px] text-[var(--t4)]">{previewYears} yr</span>
              </div>
              <div className="divide-y divide-[var(--brd)]">
                {previewPeriods.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <span className="flex-1 text-xs font-mono" style={{ color: 'var(--blue)' }}>
                      {fmtDateTR(p.periodStart)} – {fmtDateTR(p.periodEnd)}
                    </span>
                    {p.originalAmount != null && p.originalAmount > p.amount && (
                      <span className="text-xs font-mono text-[var(--t4)] line-through">{fmtCurrency(p.originalAmount)}</span>
                    )}
                    <span className="text-xs font-mono font-semibold text-[var(--t1)]">{fmtCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isEdit && (
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                placeholder="Optional notes..."
                className="w-full rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--blue)] transition-colors resize-none"
              />
            </Field>
          )}

          {error && <p className="text-xs text-[var(--red)] bg-[var(--red)]/10 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-[var(--brd)] flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Subscription'}
          </Button>
        </div>
      </form>
    </div>
  )
}
