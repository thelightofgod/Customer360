import { Router } from 'express'
import type { NextFunction, Response } from 'express'
import { ObjectId } from 'mongodb'
import { mongoRepository as repo } from '../db/mongoRepository'
import { getMongo } from '../db/mongo'
import type { AuthRequest } from '../middleware/auth'
import { logActivity } from '../lib/auditLog'

const router = Router()

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const s = v.replace(/[^0-9.,]/g, '')
    if (!s) return 0
    if (/,\d{2}$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) return parseFloat(s.replace(/\./g, '')) || 0
    return parseFloat(s.replace(/,/g, '')) || 0
  }
  return 0
}

function computeSaleValues(body: Record<string, unknown>) {
  const lisans_turu = body.lisans_turu as string
  const annualValue = lisans_turu === 'yeni'
    ? toNum(body.indirimli_musteri_bedeli_yeni)
    : toNum(body.indirimli_musteri_bedeli_ek)
  const years = body.yil_sayisi ? parseInt(String(body.yil_sayisi)) || 1 : 1
  const totalValue = lisans_turu === 'yeni' ? annualValue * years : annualValue
  return { annual_value_eur: annualValue, total_value_eur: totalValue }
}

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search = '', page = '1', limit = '40', lisans_turu = '' } = req.query as Record<string, string>
    const result = await repo.getSales(search, parseInt(page) || 1, parseInt(limit) || 40, lisans_turu)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sale = await repo.getSale(req.params.id)
    if (!sale) return res.status(404).json({ error: 'Sale not found' })
    res.json(sale)
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      firma_adi, firma_adresi,
      kontak_adi, kontak_gorevi, kontak_email,
      finans_kontak_adi, finans_kontak_gorevi, finans_kontak_email,
      lisans_turu, yil_sayisi,
      musteri_liste_bedeli_yeni, indirimli_musteri_bedeli_yeni,
      musteri_liste_bedeli_ek, indirimli_musteri_bedeli_ek,
      taahhut_bitis_tarihi, kalan_ay, kalan_donem_net_tutar,
      urunler, partner, partner_marj, partner_lisans_bedeli, kur,
      fatura_tarihi, odeme_vadesi, danismanlik_adam_gun, egitim, not: notes,
      lisans_periodlari,
    } = req.body

    if (!firma_adi) return res.status(400).json({ error: 'firma_adi is required' })

    // 1. Create the Sale document first (with computed numeric values)
    const saleId = await repo.createSale({ ...req.body, ...computeSaleValues(req.body) }, req.userEmail!)

    // 2. Find or create Account
    const providedAccountId = typeof req.body.account_id === 'string' && ObjectId.isValid(req.body.account_id)
      ? req.body.account_id as string
      : null

    let accountId: string
    if (providedAccountId) {
      accountId = providedAccountId
    } else {
      const found = await repo.findAccountIdByName(firma_adi)
      if (found) {
        accountId = found
      } else {
        accountId = await repo.createAccount({
          name: firma_adi,
          address: firma_adresi || undefined,
          licenseModel: lisans_turu === 'yeni' ? 'New License' : 'Add-on License',
          partnerName: partner || undefined,
          partnerMargin: partner_marj ? toNum(partner_marj) : null,
          partnerLicensePrice: partner_lisans_bedeli ? toNum(partner_lisans_bedeli) : null,
          currency: kur || undefined,
          invoiceDate: fatura_tarihi || undefined,
          paymentTerms: odeme_vadesi || undefined,
          consultingDays: danismanlik_adam_gun || undefined,
          trainingInfo: egitim || undefined,
        })
      }
    }

    // 3. Create contacts using canonical account name from DB (avoids case/whitespace mismatches)
    const accountDoc = await getMongo().collection('Accounts').findOne(
      { _id: new ObjectId(accountId) },
      { projection: { 'Account Name': 1 } }
    )
    const canonicalName: string = accountDoc?.['Account Name'] || firma_adi

    const incomingContacts = (req.body.contacts as Array<{ name: string; role: string; contact_type: string; email: string; existing_id?: string | null }> || [])
      .filter(c => c.name?.trim())
    for (const c of incomingContacts) {
      if (c.existing_id) continue
      const exists = await getMongo().collection('Contacts').findOne({
        'Account Name': canonicalName,
        'Contact Name': c.name.trim(),
      })
      if (!exists) {
        await repo.createContact({
          accountName: canonicalName,
          name: c.name.trim(),
          role: c.role || '',
          contactType: c.contact_type || 'general',
          email: c.email || '',
        })
      }
    }

    // 4. Create Deal
    const periods: Array<{ baslangic: string; bitis: string; tutar: string }> = lisans_periodlari || []
    const dealLines = Object.entries((urunler as Record<string, string>) || {})
      .filter(([, qty]) => qty && qty !== '0')
      .map(([name, qty]) => ({
        productName: name,
        category: '',
        productGroup: '',
        quantity: parseInt(qty) || 1,
        unit: 'User',
        listPrice: lisans_turu === 'yeni' ? toNum(musteri_liste_bedeli_yeni) : toNum(musteri_liste_bedeli_ek),
        unitPrice: lisans_turu === 'yeni' ? toNum(indirimli_musteri_bedeli_yeni) : toNum(indirimli_musteri_bedeli_ek),
      }))

    const dealId = await repo.createDeal({
      accountName: firma_adi,
      dealType: lisans_turu === 'yeni' ? 'New Sale' : 'Add-on',
      dealStatus: 'Closed Won',
      contractStart: fatura_tarihi || undefined,
      contractEnd: periods.length > 0 ? periods[periods.length - 1].bitis : undefined,
      subscriptionYears: yil_sayisi ? parseInt(yil_sayisi) || null : null,
      financeContact: (Array.isArray(req.body.contacts)
        ? (req.body.contacts as Array<{ name: string; contact_type: string }>).find(c => c.contact_type === 'financial')?.name
        : undefined) || finans_kontak_adi || undefined,
      existingCommitmentEnd: taahhut_bitis_tarihi || undefined,
      remainingMonths: kalan_ay ? parseInt(kalan_ay) || null : null,
      remainingPeriodPrice: kalan_donem_net_tutar ? toNum(kalan_donem_net_tutar) : null,
      partnerName: partner || undefined,
      partnerMargin: partner_marj ? toNum(partner_marj) : null,
      partnerLicensePrice: partner_lisans_bedeli ? toNum(partner_lisans_bedeli) : null,
      currency: kur || undefined,
      invoiceDate: fatura_tarihi || undefined,
      paymentTerms: odeme_vadesi || undefined,
      consultingDays: danismanlik_adam_gun || undefined,
      trainingInfo: egitim || undefined,
      notes: notes || undefined,
      lines: dealLines,
      paymentSchedule: periods.map(p => ({
        periodStart: p.baslangic,
        periodEnd: p.bitis,
        amount: toNum(p.tutar),
        invoiceDate: fatura_tarihi || null,
      })),
    })

    // 5. Create subscriptions for each product
    const subscriptionIds: string[] = []
    const commitmentEnd = lisans_turu === 'yeni'
      ? (periods.length > 0 ? periods[periods.length - 1].bitis : undefined)
      : (taahhut_bitis_tarihi || undefined)

    for (const [productName, qtyStr] of Object.entries((urunler as Record<string, string>) || {})) {
      const qty = parseInt(qtyStr) || 0
      if (qty <= 0) continue
      const subId = await repo.createSubscription({
        accountName: firma_adi,
        productName,
        quantity: qty,
        unit: 'User',
        unitPrice: 0,
        subscriptionYears: yil_sayisi ? parseInt(yil_sayisi) || null : null,
        commitmentEndDate: commitmentEnd,
        invoiceDate: fatura_tarihi || null,
        lisansTuru: lisans_turu as 'yeni' | 'ek',
        saleId,
        paymentPeriods: periods.map(p => ({
          periodStart: p.baslangic,
          periodEnd: p.bitis,
          amount: toNum(p.tutar),
        })),
      })
      subscriptionIds.push(subId)
    }

    // 6. Link everything back to the sale
    await repo.updateSale(saleId, { account_id: accountId, deal_id: dealId, subscription_ids: subscriptionIds })

    // 7. Recompute Account ARR from all sales
    await repo.recomputeAccountArr(accountId)

    logActivity(req.userEmail!, 'create', 'sale', saleId, firma_adi)
    res.status(201).json({ id: saleId, account_id: accountId, deal_id: dealId, subscription_ids: subscriptionIds })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    const existing = await repo.getSale(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Sale not found' })

    const merged = { ...existing, ...req.body } as Record<string, unknown>
    const update = { ...req.body, ...computeSaleValues(merged) }

    const ok = await repo.updateSale(req.params.id, update)
    if (!ok) return res.status(404).json({ error: 'Sale not found' })

    // Extract fields from merged state for Deal + Subscription updates
    const {
      firma_adi, lisans_turu, yil_sayisi,
      musteri_liste_bedeli_yeni, indirimli_musteri_bedeli_yeni,
      musteri_liste_bedeli_ek, indirimli_musteri_bedeli_ek,
      taahhut_bitis_tarihi, kalan_ay, kalan_donem_net_tutar,
      urunler, partner, partner_marj, partner_lisans_bedeli, kur,
      fatura_tarihi, odeme_vadesi, danismanlik_adam_gun, egitim, not: notes,
      lisans_periodlari, contacts: contactsArr,
    } = merged as any

    const periods: Array<{ baslangic: string; bitis: string; tutar: string }> = lisans_periodlari || []
    const commitmentEnd = lisans_turu === 'yeni'
      ? (periods.length > 0 ? periods[periods.length - 1].bitis : undefined)
      : (taahhut_bitis_tarihi || undefined)

    // Update linked Deal
    if (existing.deal_id) {
      const financialContact = Array.isArray(contactsArr)
        ? (contactsArr as Array<{ name: string; contact_type: string }>).find(c => c.contact_type === 'financial')
        : null

      const dealLines = Object.entries((urunler as Record<string, string>) || {})
        .filter(([, qty]) => qty && qty !== '0')
        .map(([name, qty]) => ({
          productName: name,
          category: '',
          productGroup: '',
          quantity: parseInt(qty) || 1,
          unit: 'User',
          listPrice: lisans_turu === 'yeni' ? toNum(musteri_liste_bedeli_yeni) : toNum(musteri_liste_bedeli_ek),
          unitPrice: lisans_turu === 'yeni' ? toNum(indirimli_musteri_bedeli_yeni) : toNum(indirimli_musteri_bedeli_ek),
        }))

      await repo.updateDeal(existing.deal_id, {
        accountName: firma_adi,
        dealType: lisans_turu === 'yeni' ? 'New Sale' : 'Add-on',
        dealStatus: 'Closed Won',
        contractStart: fatura_tarihi || undefined,
        contractEnd: periods.length > 0 ? periods[periods.length - 1].bitis : undefined,
        subscriptionYears: yil_sayisi ? parseInt(yil_sayisi) || null : null,
        financeContact: financialContact?.name || undefined,
        existingCommitmentEnd: taahhut_bitis_tarihi || undefined,
        remainingMonths: kalan_ay ? parseInt(kalan_ay) || null : null,
        remainingPeriodPrice: kalan_donem_net_tutar ? toNum(kalan_donem_net_tutar) : null,
        partnerName: partner || undefined,
        partnerMargin: partner_marj ? toNum(partner_marj) : null,
        partnerLicensePrice: partner_lisans_bedeli ? toNum(partner_lisans_bedeli) : null,
        currency: kur || undefined,
        invoiceDate: fatura_tarihi || undefined,
        paymentTerms: odeme_vadesi || undefined,
        consultingDays: danismanlik_adam_gun || undefined,
        trainingInfo: egitim || undefined,
        notes: notes || undefined,
        lines: dealLines,
        paymentSchedule: periods.map(p => ({
          periodStart: p.baslangic,
          periodEnd: p.bitis,
          amount: toNum(p.tutar),
          invoiceDate: fatura_tarihi || null,
        })),
      })
    }

    // Rebuild Subscriptions: delete by Sale ID then recreate from updated urunler
    await getMongo().collection('Subscriptions').deleteMany({ 'Sale ID': req.params.id })
    for (const [productName, qtyStr] of Object.entries((urunler as Record<string, string>) || {})) {
      const qty = parseInt(qtyStr) || 0
      if (qty <= 0) continue
      await repo.createSubscription({
        accountName: firma_adi,
        productName,
        quantity: qty,
        unit: 'User',
        unitPrice: 0,
        subscriptionYears: yil_sayisi ? parseInt(yil_sayisi) || null : null,
        commitmentEndDate: commitmentEnd,
        invoiceDate: fatura_tarihi || null,
        lisansTuru: lisans_turu as 'yeni' | 'ek',
        saleId: req.params.id,
        paymentPeriods: periods.map(p => ({
          periodStart: p.baslangic,
          periodEnd: p.bitis,
          amount: toNum(p.tutar),
        })),
      })
    }

    // Sync contacts: create new ones, skip existing_id refs and name-duplicates
    const patchAccountDoc = existing.account_id
      ? await getMongo().collection('Accounts').findOne(
          { _id: new ObjectId(existing.account_id) },
          { projection: { 'Account Name': 1 } }
        )
      : null
    const canonicalName: string = patchAccountDoc?.['Account Name'] || firma_adi

    const patchContacts = (Array.isArray(contactsArr)
      ? (contactsArr as Array<{ name: string; role: string; contact_type: string; email: string; existing_id?: string | null }>)
      : []
    ).filter(c => c.name?.trim())

    for (const c of patchContacts) {
      if (c.existing_id) continue
      const exists = await getMongo().collection('Contacts').findOne({
        'Account Name': canonicalName,
        'Contact Name': c.name.trim(),
      })
      if (!exists) {
        await repo.createContact({
          accountName: canonicalName,
          name: c.name.trim(),
          role: c.role || '',
          contactType: c.contact_type || 'general',
          email: c.email || '',
        })
      }
    }

    if (existing.account_id) await repo.recomputeAccountArr(existing.account_id)
    logActivity(req.userEmail!, 'update', 'sale', req.params.id, existing.firma_adi)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    let label = req.params.id
    let accountId: string | null = null
    try {
      const doc = await getMongo().collection('Sales').findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { firma_adi: 1, account_id: 1 } }
      )
      if (doc) { label = doc.firma_adi || label; accountId = doc.account_id || null }
    } catch {}
    const ok = await repo.deleteSale(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Sale not found' })
    if (accountId) await repo.recomputeAccountArr(accountId)
    logActivity(req.userEmail!, 'delete', 'sale', req.params.id, label)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
