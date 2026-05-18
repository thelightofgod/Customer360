import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { fmtCurrency } from '@/lib/utils'
import type { Deal, Product } from '@/types'

interface Props {
  accountName: string
  defaultPartnerName?: string | null
  defaultCurrency?: string | null
  defaultPaymentTerms?: string | null
  initialData?: Deal
  onClose: () => void
  onSaved: () => void
}

const DEAL_TYPES = ['Yeni Satış', 'Yenileme', 'Ek Lisans']
const DEAL_STATUSES = ['Teklif', 'Aktif', 'Tamamlandı']

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[var(--t4)] mb-3 flex items-center gap-2">
      <div className="w-1 h-3 rounded-full" style={{ background: color }} />
      {label}
    </div>
  )
}

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

interface LineForm {
  productId: string
  productName: string
  category: string
  productGroup: string
  quantity: string
  unit: string
  listPrice: string
  unitPrice: string
}

interface ScheduleRow {
  periodStart: string
  periodEnd: string
  amount: string
  invoiceDate: string
}

function emptyLine(): LineForm {
  return { productId: '', productName: '', category: '', productGroup: '', quantity: '1', unit: '', listPrice: '', unitPrice: '' }
}

function emptyScheduleRow(): ScheduleRow {
  return { periodStart: '', periodEnd: '', amount: '', invoiceDate: '' }
}

export default function AddDealModal({ accountName, defaultPartnerName, defaultCurrency, defaultPaymentTerms, initialData, onClose, onSaved }: Props) {
  const isEdit = !!initialData
  const [products, setProducts] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    dealType: initialData?.deal_type || 'Yeni Satış',
    dealStatus: initialData?.deal_status || 'Aktif',
    contractStart: initialData?.contract_start || '',
    contractEnd: initialData?.contract_end || '',
    subscriptionYears: initialData?.subscription_years != null ? String(initialData.subscription_years) : '',
    financeContact: initialData?.finance_contact || '',
    existingCommitmentEnd: initialData?.existing_commitment_end || '',
    partnerName: initialData?.partner_name ?? defaultPartnerName ?? '',
    partnerMargin: initialData?.partner_margin != null ? String(initialData.partner_margin) : '',
    partnerLicensePrice: initialData?.partner_license_price != null ? String(initialData.partner_license_price) : '',
    currency: initialData?.currency ?? defaultCurrency ?? '',
    invoiceDate: initialData?.invoice_date || '',
    paymentTerms: initialData?.payment_terms ?? defaultPaymentTerms ?? '',
    consultingDays: initialData?.consulting_days || '',
    trainingInfo: initialData?.training_info || '',
    notes: initialData?.notes || '',
  })

  const [lines, setLines] = useState<LineForm[]>(
    initialData?.lines.map(l => ({
      productId: '',
      productName: l.product_name,
      category: l.category,
      productGroup: l.product_group,
      quantity: String(l.quantity),
      unit: l.unit,
      listPrice: String(l.list_price),
      unitPrice: String(l.unit_price),
    })) || [emptyLine()]
  )

  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(
    initialData?.payment_schedule.map(p => ({
      periodStart: p.period_start,
      periodEnd: p.period_end,
      amount: String(p.amount),
      invoiceDate: p.invoice_date || '',
    })) || []
  )

  useEffect(() => {
    api.products.list().then(d => {
      setProducts(d.products)
      if (initialData) {
        setLines(prev => prev.map(line => {
          const match = d.products.find(p => p.name === line.productName)
          return match ? { ...line, productId: match.id } : line
        }))
      }
    }).catch(console.error)
  }, [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleProductChange(idx: number, productId: string) {
    const prod = products.find(p => p.id === productId)
    setLines(prev => prev.map((l, i) => i !== idx ? l : {
      ...l,
      productId,
      productName: prod?.name || '',
      category: prod?.category || '',
      productGroup: prod?.product_group || '',
      unit: prod?.unit_type || '',
      listPrice: prod ? String(prod.list_price) : '',
      unitPrice: prod ? String(prod.list_price) : '',
    }))
  }

  function updateLine(idx: number, field: keyof LineForm, value: string) {
    setLines(prev => prev.map((l, i) => i !== idx ? l : { ...l, [field]: value }))
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  function updateSchedule(idx: number, field: keyof ScheduleRow, value: string) {
    setScheduleRows(prev => prev.map((r, i) => i !== idx ? r : { ...r, [field]: value }))
  }

  function removeScheduleRow(idx: number) {
    setScheduleRows(prev => prev.filter((_, i) => i !== idx))
  }

  const totalList = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.listPrice) || 0), 0)
  const totalDiscounted = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0)

  const remainingMonths = form.existingCommitmentEnd
    ? Math.max(0, Math.ceil((new Date(form.existingCommitmentEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44)))
    : null

  const remainingPeriodPrice = remainingMonths != null && totalDiscounted > 0
    ? Math.round((remainingMonths / 12) * totalDiscounted)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validLines = lines.filter(l => l.productName && Number(l.quantity) > 0)
    setSaving(true)
    try {
      const payload = {
        accountName,
        dealType: form.dealType,
        dealStatus: form.dealStatus,
        contractStart: form.contractStart || undefined,
        contractEnd: form.contractEnd || undefined,
        subscriptionYears: form.subscriptionYears ? Number(form.subscriptionYears) : null,
        financeContact: form.financeContact || undefined,
        existingCommitmentEnd: form.existingCommitmentEnd || undefined,
        remainingMonths: remainingMonths ?? null,
        remainingPeriodPrice: remainingPeriodPrice ?? null,
        partnerName: form.partnerName || undefined,
        partnerMargin: form.partnerMargin ? Number(form.partnerMargin) : null,
        partnerLicensePrice: form.partnerLicensePrice ? Number(form.partnerLicensePrice) : null,
        currency: form.currency || undefined,
        invoiceDate: form.invoiceDate || undefined,
        paymentTerms: form.paymentTerms || undefined,
        consultingDays: form.consultingDays || undefined,
        trainingInfo: form.trainingInfo || undefined,
        notes: form.notes || undefined,
        lines: validLines.map(l => ({
          productName: l.productName,
          category: l.category,
          productGroup: l.productGroup,
          quantity: Number(l.quantity) || 0,
          unit: l.unit,
          listPrice: Number(l.listPrice) || 0,
          unitPrice: Number(l.unitPrice) || 0,
        })),
        paymentSchedule: scheduleRows
          .filter(r => r.periodStart && r.periodEnd && r.amount)
          .map(r => ({
            periodStart: r.periodStart,
            periodEnd: r.periodEnd,
            amount: Number(r.amount),
            invoiceDate: r.invoiceDate || null,
          })),
      }

      if (isEdit) {
        await api.deals.update(initialData!.id, payload)
        toast.success('Deal güncellendi')
      } else {
        await api.deals.create(payload)
        toast.success('Deal oluşturuldu')
      }
      onSaved()
    } catch {
      toast.error('Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-full sm:max-w-[720px] bg-[var(--bg2)] border-l border-[var(--brd)] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--brd)]">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--t1)]">{isEdit ? 'Deal Düzenle' : 'Yeni Deal'}</h2>
              <p className="text-xs text-[var(--t4)] mt-0.5">{accountName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select className="h-8 rounded-[8px] border border-[var(--brd)] bg-[var(--bg3)] px-2 text-xs text-[var(--t1)] focus:outline-none cursor-pointer appearance-none"
              value={form.dealType} onChange={e => set('dealType', e.target.value)}>
              {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="h-8 rounded-[8px] border border-[var(--brd)] bg-[var(--bg3)] px-2 text-xs text-[var(--t1)] focus:outline-none cursor-pointer appearance-none"
              value={form.dealStatus} onChange={e => set('dealStatus', e.target.value)}>
              {DEAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--bg3)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Contract Info */}
          <div>
            <SectionHeader label="Sözleşme Bilgileri" color="var(--blue)" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sözleşme Başlangıcı">
                  <Input type="date" value={form.contractStart} onChange={e => set('contractStart', e.target.value)} />
                </Field>
                <Field label="Taahhüt Bitiş Tarihi">
                  <Input type="date" value={form.contractEnd} onChange={e => set('contractEnd', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Abonelik Süresi (Yıl)">
                  <Input type="number" min="1" max="10" value={form.subscriptionYears} onChange={e => set('subscriptionYears', e.target.value)} placeholder="3" />
                </Field>
                <Field label="Finans Kontak">
                  <Input value={form.financeContact} onChange={e => set('financeContact', e.target.value)} placeholder="Ad / Görevi / E-mail" />
                </Field>
              </div>
            </div>
          </div>

          {/* Ek Lisans section */}
          {form.dealType === 'Ek Lisans' && (
            <div>
              <SectionHeader label="Ek Lisans Detayları" color="#1ad0e8" />
              <div className="space-y-3">
                <Field label="Mevcut Taahhüt Bitiş Tarihi">
                  <Input type="date" value={form.existingCommitmentEnd} onChange={e => set('existingCommitmentEnd', e.target.value)} />
                </Field>
                {remainingMonths != null && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)]/50 px-3 py-2">
                      <div className="text-[10px] text-[var(--t4)] uppercase tracking-[0.5px] mb-0.5">Kalan Ay</div>
                      <div className="text-sm font-bold text-[var(--t1)]">{remainingMonths} ay</div>
                    </div>
                    <div className="rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)]/50 px-3 py-2">
                      <div className="text-[10px] text-[var(--t4)] uppercase tracking-[0.5px] mb-0.5">Kalan Dönem Net Tutar</div>
                      <div className="text-sm font-bold" style={{ color: 'var(--green)' }}>
                        {remainingPeriodPrice != null ? fmtCurrency(remainingPeriodPrice) : '—'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Products */}
          <div>
            <SectionHeader label="Ürünler / Lisanslar" color="var(--green)" />
            <div
              className="rounded-[12px] overflow-hidden mb-2"
              style={{ border: '1px solid var(--brd)', background: 'rgba(0,0,0,0.15)' }}
            >
              {/* Table header */}
              <div className="grid grid-cols-[2fr_60px_90px_90px_90px_32px] gap-1 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.8px] text-[var(--t4)]"
                style={{ borderBottom: '1px solid var(--brd)', background: 'rgba(0,0,0,0.1)' }}>
                <span>Ürün</span>
                <span className="text-center">Adet</span>
                <span className="text-right">Liste €</span>
                <span className="text-right">İndirimli €</span>
                <span className="text-right">Toplam</span>
                <span />
              </div>
              {lines.map((line, idx) => {
                const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)
                return (
                  <div key={idx} className="grid grid-cols-[2fr_60px_90px_90px_90px_32px] gap-1 items-center px-3 py-2"
                    style={{ borderBottom: idx < lines.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    <select className="h-8 w-full rounded-[8px] border border-[var(--brd)] bg-[var(--bg3)] px-2 text-xs text-[var(--t1)] focus:outline-none appearance-none cursor-pointer"
                      value={line.productId} onChange={e => handleProductChange(idx, e.target.value)}>
                      <option value="">— Ürün seç —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <Input type="number" min="1" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)}
                      className="h-8 text-xs text-center" />
                    <Input type="number" min="0" value={line.listPrice} onChange={e => updateLine(idx, 'listPrice', e.target.value)}
                      className="h-8 text-xs text-right" placeholder="0" />
                    <Input type="number" min="0" value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                      className="h-8 text-xs text-right" placeholder="0" />
                    <span className="text-xs font-mono font-bold text-right pr-1" style={{ color: lineTotal > 0 ? 'var(--green)' : 'var(--t4)' }}>
                      {lineTotal > 0 ? fmtCurrency(lineTotal) : '—'}
                    </span>
                    <button type="button" onClick={() => removeLine(idx)}
                      className="w-7 h-7 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between">
              <Button type="button" size="sm" onClick={() => setLines(prev => [...prev, emptyLine()])}>
                <Plus className="w-3 h-3" /> Ürün Ekle
              </Button>
              {(totalList > 0 || totalDiscounted > 0) && (
                <div className="flex gap-4 text-xs">
                  {totalList > 0 && (
                    <span className="text-[var(--t3)]">
                      Liste: <span className="font-mono font-semibold text-[var(--t2)]">{fmtCurrency(totalList)}</span>
                    </span>
                  )}
                  {totalDiscounted > 0 && (
                    <span className="text-[var(--t3)]">
                      İndirimli: <span className="font-mono font-bold" style={{ color: 'var(--green)' }}>{fmtCurrency(totalDiscounted)}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Partner */}
          <div>
            <SectionHeader label="Partner Bilgileri" color="#f7aa28" />
            <div className="space-y-3">
              <Field label="Partner Adı">
                <Input value={form.partnerName} onChange={e => set('partnerName', e.target.value)} placeholder="Partner firma adı" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Marj %">
                  <Input type="number" min="0" max="100" value={form.partnerMargin} onChange={e => set('partnerMargin', e.target.value)} placeholder="20" />
                </Field>
                <Field label="Partner Lisans Bedeli (€)">
                  <Input type="number" min="0" value={form.partnerLicensePrice} onChange={e => set('partnerLicensePrice', e.target.value)} placeholder="0" />
                </Field>
                <Field label="Kur / Para Birimi">
                  <Input value={form.currency} onChange={e => set('currency', e.target.value)} placeholder="EUR" />
                </Field>
              </div>
            </div>
          </div>

          {/* Fatura & Ek Bilgiler */}
          <div>
            <SectionHeader label="Fatura & Ek Bilgiler" color="#a07cf0" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fatura Tarihi">
                  <Input type="date" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} />
                </Field>
                <Field label="Ödeme Vadesi">
                  <Input value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} placeholder="30 Gün" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Danışmanlık (Adam/Gün)">
                  <Input value={form.consultingDays} onChange={e => set('consultingDays', e.target.value)} placeholder="5 gün" />
                </Field>
                <Field label="Eğitim">
                  <Input value={form.trainingInfo} onChange={e => set('trainingInfo', e.target.value)} placeholder="2 kişi ücretsiz" />
                </Field>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div>
            <SectionHeader label="Lisans Kiralama Dönemi / Ödeme Takvimi" color="#2ed896" />
            <div
              className="rounded-[12px] overflow-hidden mb-2"
              style={{ border: '1px solid var(--brd)', background: 'rgba(0,0,0,0.15)' }}
            >
              <div className="grid grid-cols-[1fr_1fr_110px_110px_32px] gap-1 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.8px] text-[var(--t4)]"
                style={{ borderBottom: '1px solid var(--brd)', background: 'rgba(0,0,0,0.1)' }}>
                <span>Dönem Başlangıcı</span>
                <span>Dönem Bitişi</span>
                <span className="text-right">Fatura Tutarı (€)</span>
                <span className="text-center">Fatura Tarihi</span>
                <span />
              </div>
              {scheduleRows.length === 0 && (
                <div className="text-center py-5 text-xs text-[var(--t4)]">Henüz satır eklenmedi</div>
              )}
              {scheduleRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_110px_110px_32px] gap-1 items-center px-3 py-2"
                  style={{ borderBottom: idx < scheduleRows.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  <Input type="date" value={row.periodStart} onChange={e => updateSchedule(idx, 'periodStart', e.target.value)} className="h-8 text-xs" />
                  <Input type="date" value={row.periodEnd} onChange={e => updateSchedule(idx, 'periodEnd', e.target.value)} className="h-8 text-xs" />
                  <Input type="number" min="0" value={row.amount} onChange={e => updateSchedule(idx, 'amount', e.target.value)} placeholder="0" className="h-8 text-xs text-right" />
                  <Input type="date" value={row.invoiceDate} onChange={e => updateSchedule(idx, 'invoiceDate', e.target.value)} className="h-8 text-xs" />
                  <button type="button" onClick={() => removeScheduleRow(idx)}
                    className="w-7 h-7 rounded flex items-center justify-center text-[var(--t4)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" size="sm" onClick={() => setScheduleRows(prev => [...prev, emptyScheduleRow()])}>
              <Plus className="w-3 h-3" /> Satır Ekle
            </Button>
          </div>

          {/* Notes */}
          <Field label="Not">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Ek notlar..."
              rows={3}
              className="w-full rounded-[10px] border border-[var(--brd)] bg-[var(--bg3)] px-3 py-2 text-sm text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--blue)] transition-colors resize-none"
            />
          </Field>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--brd)] flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={saving}>İptal</Button>
          <Button variant="primary" onClick={handleSubmit as any} disabled={saving}>
            {saving ? 'Kaydediliyor…' : isEdit ? 'Güncelle' : 'Deal Oluştur'}
          </Button>
        </div>
      </div>
    </div>
  )
}
