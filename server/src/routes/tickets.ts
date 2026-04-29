import { Router } from 'express'
import { mongoRepository as repo } from '../db/mongoRepository'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { status, priority, account_id } = req.query as Record<string, string>
    const tickets = await repo.getTickets(status, priority, account_id)
    res.json({ tickets, total: tickets.length })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

export default router
