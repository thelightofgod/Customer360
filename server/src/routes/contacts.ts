import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import { mongoRepository as repo } from '../db/mongoRepository'

const router = Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { account_id, search = '', page = '1', limit = '18' } = req.query as Record<string, string>
    const result = await repo.getContacts(account_id, search, parseInt(page) || 1, parseInt(limit) || 18)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountName, name } = req.body
    if (!accountName || !name)
      return res.status(400).json({ error: 'accountName and name are required' })
    const id = await repo.createContact(req.body)
    res.status(201).json({ id })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await repo.updateContact(req.params.id, req.body)
    if (!ok) return res.status(404).json({ error: 'Contact not found' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await repo.deleteContact(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Contact not found' })
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
