import { Router } from 'express'
import { mongoRepository as repo } from '../db/mongoRepository'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const subscriptions = await repo.getAllSubscriptions()
    res.json({ subscriptions, total: subscriptions.length })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

router.post('/', async (req, res) => {
  try {
    const { accountName, productName, quantity, unitPrice } = req.body
    if (!accountName || !productName || !quantity || unitPrice == null)
      return res.status(400).json({ error: 'accountName, productName, quantity and unitPrice are required' })
    const id = await repo.createSubscription(req.body)
    res.status(201).json({ id })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const ok = await repo.updateSubscription(req.params.id, req.body)
    if (!ok) return res.status(404).json({ error: 'Subscription not found' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const ok = await repo.deleteSubscription(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Subscription not found' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

export default router
