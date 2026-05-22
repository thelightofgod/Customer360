import { Router } from 'express'
import type { NextFunction, Response } from 'express'
import { ObjectId } from 'mongodb'
import { mongoRepository as repo } from '../db/mongoRepository'
import { getMongo } from '../db/mongo'
import type { AuthRequest } from '../middleware/auth'
import { logActivity, buildDiff } from '../lib/auditLog'
import type { FieldMap } from '../lib/auditLog'

const router = Router()

const SCHEDULE_FIELD_MAP: FieldMap = {
  periodStart: { mongo: 'Period Start', label: 'Period Start' },
  periodEnd:   { mongo: 'Period End',   label: 'Period End' },
  amount:      { mongo: 'Amount (€)',   label: 'Amount' },
  invoiceDate: { mongo: 'Invoice Date', label: 'Invoice Date' },
}

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { accountName, periodStart, periodEnd, amount } = req.body
    if (!accountName || !periodStart || !periodEnd || amount == null)
      return res.status(400).json({ error: 'accountName, periodStart, periodEnd and amount are required' })
    const id = await repo.createPaymentSchedule(req.body)
    logActivity(req.userEmail!, 'create', 'payment_schedule', id, accountName)
    res.status(201).json({ id })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    let scheduleLabel = req.params.id
    let existingDoc: any = null
    try {
      existingDoc = await getMongo().collection('PaymentSchedules').findOne({ _id: new ObjectId(req.params.id) })
      if (existingDoc?.['Account Name']) scheduleLabel = existingDoc['Account Name']
    } catch {}

    const ok = await repo.updatePaymentSchedule(req.params.id, req.body)
    if (!ok) return res.status(404).json({ error: 'Payment schedule not found' })
    const changes = existingDoc ? buildDiff(existingDoc, req.body, SCHEDULE_FIELD_MAP) : undefined
    logActivity(req.userEmail!, 'update', 'payment_schedule', req.params.id, scheduleLabel, changes)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    let scheduleLabel = req.params.id
    try {
      const doc = await getMongo().collection('PaymentSchedules').findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { 'Account Name': 1 } }
      )
      if (doc?.['Account Name']) scheduleLabel = doc['Account Name']
    } catch {}

    const ok = await repo.deletePaymentSchedule(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Payment schedule not found' })
    logActivity(req.userEmail!, 'delete', 'payment_schedule', req.params.id, scheduleLabel)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
