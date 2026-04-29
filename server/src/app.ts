import express from 'express'
import cors from 'cors'
import { getMongo } from './db/mongo'
import accountsRouter from './routes/accounts'
import productsRouter from './routes/products'
import ticketsRouter from './routes/tickets'
import contactsRouter from './routes/contacts'
import activitiesRouter from './routes/activities'
import subscriptionsRouter from './routes/subscriptions'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  try { getMongo(); res.json({ ok: true, db: 'connected' }) }
  catch { res.status(503).json({ ok: false, db: 'not connected' }) }
})

app.use('/api/accounts', accountsRouter)
app.use('/api/products', productsRouter)
app.use('/api/tickets', ticketsRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/subscriptions', subscriptionsRouter)

export default app
