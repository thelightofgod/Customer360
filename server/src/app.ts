import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { getMongo } from './db/mongo'
import { requireAuth } from './middleware/auth'
import authRouter from './routes/auth'
import accountsRouter from './routes/accounts'
import productsRouter from './routes/products'
import ticketsRouter from './routes/tickets'
import contactsRouter from './routes/contacts'
import activitiesRouter from './routes/activities'
import subscriptionsRouter from './routes/subscriptions'
import paymentSchedulesRouter from './routes/paymentSchedules'
import dealsRouter from './routes/deals'
import auditLogsRouter from './routes/auditLogs'
import salesRouter from './routes/sales'

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  try { getMongo(); res.json({ ok: true, db: 'connected' }) }
  catch { res.status(503).json({ ok: false, db: 'not connected' }) }
})

// Public
app.use('/api/auth', authRouter)

// Protected
app.use('/api/accounts', requireAuth, accountsRouter)
app.use('/api/products', requireAuth, productsRouter)
app.use('/api/tickets', requireAuth, ticketsRouter)
app.use('/api/contacts', requireAuth, contactsRouter)
app.use('/api/activities', requireAuth, activitiesRouter)
app.use('/api/subscriptions', requireAuth, subscriptionsRouter)
app.use('/api/payment-schedules', requireAuth, paymentSchedulesRouter)
app.use('/api/deals', requireAuth, dealsRouter)
app.use('/api/audit-logs', requireAuth, auditLogsRouter)
app.use('/api/sales', requireAuth, salesRouter)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
