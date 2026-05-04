import { Router } from 'express'
import { mongoRepository as repo } from '../db/mongoRepository'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { account_id } = req.query as Record<string, string>
    const contacts = await repo.getContacts(account_id)
    res.json({ contacts, total: contacts.length })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

router.post('/', async (req, res) => {
  try {
    const { accountName, name } = req.body
    if (!accountName || !name)
      return res.status(400).json({ error: 'accountName and name are required' })
    const id = await repo.createContact(req.body)
    res.status(201).json({ id })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const ok = await repo.updateContact(req.params.id, req.body)
    if (!ok) return res.status(404).json({ error: 'Contact not found' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const ok = await repo.deleteContact(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Contact not found' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

export default router
