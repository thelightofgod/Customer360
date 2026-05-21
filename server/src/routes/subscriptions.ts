import { Router } from 'express'
import type { NextFunction, Response } from 'express'
import { ObjectId } from 'mongodb'
import { mongoRepository as repo } from '../db/mongoRepository'
import { getMongo } from '../db/mongo'
import type { AuthRequest } from '../middleware/auth'
import { logActivity, buildDiff } from '../lib/auditLog'
import type { FieldMap } from '../lib/auditLog'

const router = Router()

const SUBSCRIPTION_FIELD_MAP: FieldMap = {
  productName:       { mongo: 'Product Name',        label: 'Product' },
  category:          { mongo: 'Category',             label: 'Category' },
  productGroup:      { mongo: 'Product Group',        label: 'Product Group' },
  quantity:          { mongo: 'Quantity',              label: 'Quantity' },
  unit:              { mongo: 'Unit',                  label: 'Unit' },
  listPrice:         { mongo: 'List Price (€)',        label: 'List Price' },
  unitPrice:         { mongo: 'Unit Price (€)',        label: 'Unit Price' },
  notes:             { mongo: 'Notes',                 label: 'Notes' },
  subscriptionYears: { mongo: 'Subscription Years',   label: 'Subscription Years' },
  commitmentEndDate: { mongo: 'Commitment End Date',  label: 'Commitment End Date' },
  invoiceDate:       { mongo: 'Invoice Date',          label: 'Invoice Date' },
}

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search = '', page = '1', limit = '20' } = req.query as Record<string, string>
    const result = await repo.getAllSubscriptions(search, parseInt(page) || 1, parseInt(limit) || 20)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { accountName, productName, quantity, unitPrice } = req.body
    if (!accountName || !productName || !quantity || unitPrice == null)
      return res.status(400).json({ error: 'accountName, productName, quantity and unitPrice are required' })
    const id = await repo.createSubscription(req.body)
    logActivity(req.userEmail!, 'create', 'subscription', id, `${productName} @ ${accountName}`)
    res.status(201).json({ id })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let subLabel = req.params.id
    let existingDoc: any = null
    try {
      existingDoc = await getMongo().collection('Subscriptions').findOne({ _id: new ObjectId(req.params.id) })
      if (existingDoc) {
        const p = existingDoc['Product Name'] || ''
        const a = existingDoc['Account Name'] || ''
        subLabel = a ? `${p} @ ${a}` : p
      }
    } catch {}

    const ok = await repo.updateSubscription(req.params.id, req.body)
    if (!ok) return res.status(404).json({ error: 'Subscription not found' })
    const changes = existingDoc ? buildDiff(existingDoc, req.body, SUBSCRIPTION_FIELD_MAP) : undefined
    logActivity(req.userEmail!, 'update', 'subscription', req.params.id, subLabel, changes)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let subLabel = req.params.id
    try {
      const doc = await getMongo().collection('Subscriptions').findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { 'Product Name': 1, 'Account Name': 1 } }
      )
      if (doc) {
        const p = doc['Product Name'] || ''
        const a = doc['Account Name'] || ''
        subLabel = a ? `${p} @ ${a}` : p
      }
    } catch {}

    const ok = await repo.deleteSubscription(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Subscription not found' })
    logActivity(req.userEmail!, 'delete', 'subscription', req.params.id, subLabel)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
