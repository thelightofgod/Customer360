import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import { mongoRepository as repo } from '../db/mongoRepository'

const router = Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, priority, account_id } = req.query as Record<string, string>
    const tickets = await repo.getTickets(status, priority, account_id)
    res.json({ tickets, total: tickets.length })
  } catch (e) {
    next(e)
  }
})

export default router
