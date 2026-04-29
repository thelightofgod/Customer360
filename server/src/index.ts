import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { connectMongo } from './db/mongo'
import accountsRouter from './routes/accounts'
import productsRouter from './routes/products'
import ticketsRouter from './routes/tickets'
import contactsRouter from './routes/contacts'
import activitiesRouter from './routes/activities'
import subscriptionsRouter from './routes/subscriptions'

const app = express()
const PORT = process.env.PORT || 8000

app.use(cors())
app.use(express.json())

app.use('/api/accounts', accountsRouter)
app.use('/api/products', productsRouter)
app.use('/api/tickets', ticketsRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/subscriptions', subscriptionsRouter)

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist')
app.use(express.static(clientDist))
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`Customer 360 running at http://localhost:${PORT}`)
  })
}).catch(err => {
  console.error('MongoDB connection failed:', err)
  process.exit(1)
})
