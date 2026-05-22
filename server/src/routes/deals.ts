import { Router } from 'express'
import type { NextFunction, Response } from 'express'
import { ObjectId } from 'mongodb'
import { mongoRepository as repo } from '../db/mongoRepository'
import { getMongo } from '../db/mongo'
import type { AuthRequest } from '../middleware/auth'
import { logActivity, buildDiff } from '../lib/auditLog'
import type { FieldMap } from '../lib/auditLog'

const router = Router()

const DEAL_FIELD_MAP: FieldMap = {
  accountName:        { mongo: 'Account Name',              label: 'Account' },
  dealType:           { mongo: 'Deal Type',                 label: 'Deal Type' },
  dealStatus:         { mongo: 'Deal Status',               label: 'Status' },
  contractStart:      { mongo: 'Contract Start',            label: 'Contract Start' },
  contractEnd:        { mongo: 'Contract End',              label: 'Contract End' },
  subscriptionYears:  { mongo: 'Subscription Years',        label: 'Subscription Years' },
  financeContact:     { mongo: 'Finance Contact',           label: 'Finance Contact' },
  partnerName:        { mongo: 'Partner Name',              label: 'Partner Name' },
  partnerMargin:      { mongo: 'Partner Margin %',          label: 'Partner Margin' },
  partnerLicensePrice:{ mongo: 'Partner License Price (€)', label: 'Partner License Price' },
  currency:           { mongo: 'Currency',                  label: 'Currency' },
  invoiceDate:        { mongo: 'Invoice Date',              label: 'Invoice Date' },
  paymentTerms:       { mongo: 'Payment Terms',             label: 'Payment Terms' },
  consultingDays:     { mongo: 'Consulting Days',           label: 'Consulting Days' },
  trainingInfo:       { mongo: 'Training Info',             label: 'Training Info' },
  notes:              { mongo: 'Notes',                     label: 'Notes' },
}

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { account_name } = req.query as Record<string, string>
    if (!account_name) return res.status(400).json({ error: 'account_name is required' })
    const deals = await repo.getDeals(account_name)
    res.json({ deals })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    const deal = await repo.getDeal(req.params.id)
    if (!deal) return res.status(404).json({ error: 'Deal not found' })
    res.json(deal)
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { accountName, dealType, dealStatus } = req.body
    if (!accountName || !dealType || !dealStatus)
      return res.status(400).json({ error: 'accountName, dealType and dealStatus are required' })
    const id = await repo.createDeal(req.body)
    logActivity(req.userEmail!, 'create', 'deal', id, `${dealType} - ${accountName}`)
    res.status(201).json({ id })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    let dealLabel = req.params.id
    let existingDoc: any = null
    try {
      existingDoc = await getMongo().collection('Deals').findOne({ _id: new ObjectId(req.params.id) })
      if (existingDoc) {
        const t = existingDoc['Deal Type'] || ''
        const a = existingDoc['Account Name'] || ''
        dealLabel = a ? `${t} - ${a}` : t
      }
    } catch {}

    const ok = await repo.updateDeal(req.params.id, req.body)
    if (!ok) return res.status(404).json({ error: 'Deal not found' })
    const changes = existingDoc ? buildDiff(existingDoc, req.body, DEAL_FIELD_MAP) : undefined
    logActivity(req.userEmail!, 'update', 'deal', req.params.id, dealLabel, changes)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    let dealLabel = req.params.id
    try {
      const doc = await getMongo().collection('Deals').findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { 'Deal Type': 1, 'Account Name': 1 } }
      )
      if (doc) {
        const t = doc['Deal Type'] || ''
        const a = doc['Account Name'] || ''
        dealLabel = a ? `${t} - ${a}` : t
      }
    } catch {}

    const ok = await repo.deleteDeal(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Deal not found' })
    logActivity(req.userEmail!, 'delete', 'deal', req.params.id, dealLabel)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
