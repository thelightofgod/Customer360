import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import { mongoRepository as repo } from '../db/mongoRepository'

const router = Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { account_id, limit } = req.query as Record<string, string>
    const activities = await repo.getActivities(account_id, limit ? Number(limit) : 50)
    res.json({ activities, total: activities.length })
  } catch (e) {
    next(e)
  }
})

export default router
