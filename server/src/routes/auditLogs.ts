import { Router } from 'express'
import type { NextFunction, Response } from 'express'
import { getMongo } from '../db/mongo'
import type { AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '40',
      action = '',
      entityType = '',
    } = req.query as Record<string, string>

    const db = getMongo()
    const filter: Record<string, unknown> = {}
    if (action) filter.action = action
    if (entityType) filter.entity_type = entityType

    const pageNum = parseInt(page) || 1
    const limitNum = Math.min(parseInt(limit) || 40, 100)
    const skip = (pageNum - 1) * limitNum

    const [logs, total] = await Promise.all([
      db.collection('AuditLogs')
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection('AuditLogs').countDocuments(filter),
    ])

    res.json({
      logs: logs.map(l => ({
        id: l._id.toHexString(),
        timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : l.timestamp,
        user_email: l.user_email,
        action: l.action,
        entity_type: l.entity_type,
        entity_id: l.entity_id,
        entity_name: l.entity_name,
        changes: l.changes ?? null,
      })),
      total,
    })
  } catch (e) {
    next(e)
  }
})

export default router
