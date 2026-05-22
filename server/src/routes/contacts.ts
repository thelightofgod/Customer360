import { Router } from 'express'
import type { NextFunction, Response } from 'express'
import { ObjectId } from 'mongodb'
import { mongoRepository as repo } from '../db/mongoRepository'
import { getMongo } from '../db/mongo'
import type { AuthRequest } from '../middleware/auth'
import { logActivity, buildDiff } from '../lib/auditLog'
import type { FieldMap } from '../lib/auditLog'

const router = Router()

const CONTACT_FIELD_MAP: FieldMap = {
  name:        { mongo: 'Contact Name',  label: 'Name' },
  role:        { mongo: 'Role / Title',  label: 'Role' },
  contactType: { mongo: 'Contact Type',  label: 'Contact Type' },
  email:       { mongo: 'Email',         label: 'Email' },
  phone:       { mongo: 'Phone',         label: 'Phone' },
  notes:       { mongo: 'Notes',         label: 'Notes' },
  accountName: { mongo: 'Account Name',  label: 'Account' },
}

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { account_id, search = '', page = '1', limit = '18' } = req.query as Record<string, string>
    const result = await repo.getContacts(account_id, search, parseInt(page) || 1, parseInt(limit) || 18)
    res.json(result)
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body
    if (!name)
      return res.status(400).json({ error: 'name is required' })
    const id = await repo.createContact(req.body)
    const label = req.body.accountName ? `${name} (${req.body.accountName})` : name
    logActivity(req.userEmail!, 'create', 'contact', id, label)
    res.status(201).json({ id })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    let contactLabel = req.params.id
    let existingDoc: any = null
    try {
      existingDoc = await getMongo().collection('Contacts').findOne({ _id: new ObjectId(req.params.id) })
      if (existingDoc) {
        const n = existingDoc['Contact Name'] || ''
        const a = existingDoc['Account Name'] || ''
        contactLabel = a ? `${n} (${a})` : n
      }
    } catch {}

    const ok = await repo.updateContact(req.params.id, req.body)
    if (!ok) return res.status(404).json({ error: 'Contact not found' })
    const changes = existingDoc ? buildDiff(existingDoc, req.body, CONTACT_FIELD_MAP) : undefined
    logActivity(req.userEmail!, 'update', 'contact', req.params.id, contactLabel, changes)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' })
    let contactLabel = req.params.id
    try {
      const doc = await getMongo().collection('Contacts').findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { 'Contact Name': 1, 'Account Name': 1 } }
      )
      if (doc) {
        const n = doc['Contact Name'] || ''
        const a = doc['Account Name'] || ''
        contactLabel = a ? `${n} (${a})` : n
      }
    } catch {}

    const ok = await repo.deleteContact(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Contact not found' })
    logActivity(req.userEmail!, 'delete', 'contact', req.params.id, contactLabel)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default router
