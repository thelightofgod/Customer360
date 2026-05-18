import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import { mongoRepository as repo } from '../db/mongoRepository'

const router = Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { account_name } = req.query as Record<string, string>
    if (!account_name) return res.status(400).json({ error: 'account_name is required' })
    const deals = await repo.getDeals(account_name)
    res.json({ deals })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deal = await repo.getDeal(req.params.id)
    if (!deal) return res.status(404).json({ error: 'Deal not found' })
    res.json(deal)
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountName, dealType, dealStatus } = req.body
    if (!accountName || !dealType || !dealStatus)
      return res.status(400).json({ error: 'accountName, dealType and dealStatus are required' })
    const id = await repo.createDeal(req.body)
    res.status(201).json({ id })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await repo.updateDeal(req.params.id, req.body)
    if (!ok) return res.status(404).json({ error: 'Deal not found' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await repo.deleteDeal(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Deal not found' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
