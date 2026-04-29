import 'dotenv/config'
import express from 'express'
import path from 'path'
import { connectMongo } from './db/mongo'
import app from './app'

const PORT = process.env.PORT || 8000

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
