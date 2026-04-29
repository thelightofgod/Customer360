import { Router } from 'express'
import { ObjectId } from 'mongodb'
import { getMongo } from '../db/mongo'
import { mongoRepository as repo } from '../db/mongoRepository'

const router = Router()

router.get('/summary', async (_req, res) => {
  try {
    res.json(await repo.getAccountsSummary())
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

router.get('/', async (req, res) => {
  try {
    const { filter = 'all', search = '', sort = 'name', order = 'asc' } = req.query as Record<string, string>
    const accounts = await repo.getAccounts(filter, search, sort, order)
    res.json({ accounts, total: accounts.length })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

router.post('/', async (req, res) => {
  try {
    if (!req.body?.name?.trim()) return res.status(400).json({ error: 'Account name is required' })
    const id = await repo.createAccount(req.body)
    res.status(201).json({ id })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

router.patch('/:id/notes', async (req, res) => {
  try {
    await getMongo().collection('Accounts').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { Notes: req.body.notes ?? '' } }
    )
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const ok = await repo.deleteAccount(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Account not found' })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const account = await repo.getAccount(req.params.id)
    if (!account) return res.status(404).json({ error: 'Account not found' })
    res.json(account)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

export default router
