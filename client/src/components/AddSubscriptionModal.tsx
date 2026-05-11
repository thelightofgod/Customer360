import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
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

export default function AddSubscriptionModal({ onClose, onCreated, prefilledAccount, initialData }: Props) {
  const isEdit = !!initialData
  const [accounts, setAccounts] = useState<Account[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    accountName: initialData?.account_name || prefilledAccount?.name || '',
    productId: '',
    quantity: initialData ? String(initialData.quantity) : '1',
    unitPrice: initialData ? String(initialData.unit_price) : '',
    notes: '',
  })

  useEffect(() => {
    api.products.list().then(d => {
      setProducts(d.products)
      if (initialData) {
        const match = d.products.find(p => p.name === initialData.product_name)
        if (match) setForm(f => ({ ...f, productId: match.id }))
      }
    }).catch(console.error)

    if (!prefilledAccount && !isEdit) {
      api.accounts.list({ filter: 'active' }).then(d => setAccounts(d.accounts)).catch(console.error)
    }
  }, [])

  const selectedProduct = products.find(p => p.id === form.productId)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleProductChange(productId: string) {
    const prod = products.find(p => p.id === productId)
    setForm(f => ({ ...f, productId, unitPrice: prod ? String(prod.list_price) : '' }))
  }

  const total = (Number(form.quantity) || 0) * (Number(form.unitPrice) || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.accountName) { setError('Account is required'); return }
    if (!form.productId) { setError('Product is required'); return }
    if (!form.quantity || !form.unitPrice) { setError('Quantity and unit price are required'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.subscriptions.update(initialData!.id, {
          productName: selectedProduct?.name || initialData!.product_name,
          category: selectedProduct?.category || initialData!.category,
          productGroup: selectedProduct?.product_group || initialData!.product_group,
          quantity: Number(form.quantity),
          unit: selectedProduct?.unit_type || initialData!.unit_label,
          unitPrice: Number(form.unitPrice),
        })
      } else {
        await api.subscriptions.create({
          accountName: form.accountName,
          productName: selectedProduct?.name || '',
          category: selectedProduct?.category || '',
          productGroup: selectedProduct?.product_group || '',
          quantity: Number(form.quantity),
          unit: selectedProduct?.unit_type || '',
          unitPrice: Number(form.unitPrice),
          notes: form.notes || undefined,
        })
      }
      onCreated()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-full sm:max-w-[480px] bg-[var(--bg2)] border-l border-[var(--brd)] flex flex-col shadow-2xl">
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
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--bg3)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
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

          <Field label="Product" required>
            <select className={selectClass} value={form.productId} onChange={e => handleProductChange(e.target.value)}>
              <option value="">— Select product —</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.product_group}</option>
              ))}
            </select>
          </Field>

          {selectedProduct && (
            <div className="text-xs text-[var(--t4)] bg-[var(--bg3)] border border-[var(--brd)] rounded-[10px] px-3 py-2">
              {selectedProduct.category} · {selectedProduct.product_group} · Unit: {selectedProduct.unit_type}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" required>
              <Input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </Field>
            <Field label="Unit Price (€)" required>
              <Input type="number" min="0" value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} placeholder="0" />
            </Field>
          </div>

          {total > 0 && (
            <div className="flex justify-between items-center px-3 py-2.5 bg-[var(--green)]/10 border border-[var(--green)]/20 rounded-[10px]">
              <span className="text-xs text-[var(--t3)]">Total</span>
              <span className="text-sm font-bold font-mono text-[var(--green)]">€{total.toLocaleString('de-DE')}</span>
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
        </form>

        <div className="px-6 py-4 border-t border-[var(--brd)] flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit as any} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Subscription'}
          </Button>
        </div>
      </div>
    </div>
  )
}
