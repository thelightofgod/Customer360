import { Router } from 'express'
import { mongoRepository as repo } from '../db/mongoRepository'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const products = await repo.getProducts()
    res.json({ products, total: products.length })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const product = await repo.getProduct(req.params.id)
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

export default router
