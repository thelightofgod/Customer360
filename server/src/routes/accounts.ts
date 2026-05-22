import { Router } from 'express'
import type { NextFunction, Response } from 'express'
import { ObjectId } from 'mongodb'
import { mongoRepository as repo } from '../db/mongoRepository'
import { getMongo } from '../db/mongo'
import type { AuthRequest } from '../middleware/auth'
import { logActivity, buildDiff } from '../lib/auditLog'
import type { FieldMap } from '../lib/auditLog'

const router = Router()

const ACCOUNT_FIELD_MAP: FieldMap = {
  sector:             { mongo: 'Sector / Industry',         label: 'Sector' },
  tier:               { mongo: 'Tier',                      label: 'Tier' },
  edition:            { mongo: 'Edition',                   label: 'Edition' },
  licenseModel:       { mongo: 'License Model',             label: 'License Model' },
  csm:                { mongo: 'CSM Assigned',              label: 'CSM' },
  contractStart:      { mongo: 'Contract Start',            label: 'Contract Start' },
  renewalDate:        { mongo: 'Renewal Date',              label: 'Renewal Date' },
  arr:                { mongo: 'ARR (€)',                   label: 'ARR' },
  nps:                { mongo: 'NPS (1-10)',                label: 'NPS' },
  slaCompliance:      { mongo: 'SLA Compliance %',          label: 'SLA Compliance' },
  avgResolution:      { mongo: 'Avg Resolution',            label: 'Avg Resolution' },
  notes:              { mongo: 'Notes',                     label: 'Notes' },
  address:            { mongo: 'Address',                   label: 'Address' },
  partnerName:        { mongo: 'Partner Name',              label: 'Partner Name' },
  partnerMargin:      { mongo: 'Partner Margin %',          label: 'Partner Margin' },
  partnerLicensePrice:{ mongo: 'Partner License Price (€)', label: 'Partner License Price' },
  currency:           { mongo: 'Currency',                  label: 'Currency' },
  invoiceDate:        { mongo: 'Invoice Date',              label: 'Invoice Date' },
  paymentTerms:       { mongo: 'Payment Terms',             label: 'Payment Terms' },
  consultingDays:     { mongo: 'Consulting Days',           label: 'Consulting Days' },
  trainingInfo:       { mongo: 'Training Info',             label: 'Training Info' },
}

router.get('/summary', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await repo.getAccountsSummary())
  } catch (e) {
    next(e)
  }
})

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { filter = 'all', search = '', sort = 'name', order = 'asc', page = '1', limit = '20' } = req.query as Record<string, string>
    const result = await repo.getAccounts(filter, search, sort, order, parseInt(page) || 1, parseInt(limit) || 20)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Account name is required' })
    const id = await repo.createAccount(req.body)
    logActivity(req.userEmail!, 'create', 'account', id, req.body.name)
    res.status(201).json({ id })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    let accountName = req.params.id
    let existingDoc: any = null
    try {
      existingDoc = await getMongo().collection('Accounts').findOne({ _id: new ObjectId(req.params.id) })
      if (existingDoc?.['Account Name']) accountName = existingDoc['Account Name']
    } catch {}

    const ok = await repo.updateAccount(req.params.id, req.body)
    if (!ok) return res.status(404).json({ error: 'Account not found' })
    const changes = existingDoc ? buildDiff(existingDoc, req.body, ACCOUNT_FIELD_MAP) : undefined
    logActivity(req.userEmail!, 'update', 'account', req.params.id, accountName, changes)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    const { ok, name } = await repo.deleteAccount(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Account not found' })
    logActivity(req.userEmail!, 'delete', 'account', req.params.id, name)
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    const account = await repo.getAccount(req.params.id)
    if (!account) return res.status(404).json({ error: 'Account not found' })
    res.json(account)
  } catch (e) {
    next(e)
  }
})

export default router
