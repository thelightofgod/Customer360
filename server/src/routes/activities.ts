import { Router } from 'express'
import { mongoRepository as repo } from '../db/mongoRepository'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { account_id, limit } = req.query as Record<string, string>
    const activities = await repo.getActivities(account_id, limit ? Number(limit) : 50)
    res.json({ activities, total: activities.length })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

export default router
