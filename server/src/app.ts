import express from 'express'
import cors from 'cors'
import accountsRouter from './routes/accounts'
import productsRouter from './routes/products'
import ticketsRouter from './routes/tickets'
import contactsRouter from './routes/contacts'
import activitiesRouter from './routes/activities'
import subscriptionsRouter from './routes/subscriptions'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/accounts', accountsRouter)
app.use('/api/products', productsRouter)
app.use('/api/tickets', ticketsRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/subscriptions', subscriptionsRouter)

export default app
