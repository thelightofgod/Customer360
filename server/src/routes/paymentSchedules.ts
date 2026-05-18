import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import { mongoRepository as repo } from '../db/mongoRepository'

const router = Router()

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountName, periodStart, periodEnd, amount } = req.body
    if (!accountName || !periodStart || !periodEnd || amount == null)
      return res.status(400).json({ error: 'accountName, periodStart, periodEnd and amount are required' })
    const id = await repo.createPaymentSchedule(req.body)
    res.status(201).json({ id })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await repo.updatePaymentSchedule(req.params.id, req.body)
    if (!ok) return res.status(404).json({ error: 'Payment schedule not found' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await repo.deletePaymentSchedule(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Payment schedule not found' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
