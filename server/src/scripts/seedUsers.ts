import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { getMongo, connectMongo } from '../db/mongo'

const users = [
  { email: 'omer.citak@bitechnology.com', name: 'Ömer Çıtak' },
  { email: 'gamze.akbulut@bitechnology.com', name: 'Gamze Akbulut' },
  { email: 'kerem.uslu@bitechnology.com', name: 'Kerem Uslu' },
]

async function seed() {
  await connectMongo()
  const db = getMongo()
  for (const u of users) {
    const hash = await bcrypt.hash('12345', 10)
    await db.collection('Users').updateOne(
      { email: u.email },
      { $set: { email: u.email, name: u.name, password: hash } },
      { upsert: true }
    )
    console.log(`✓ ${u.email}`)
  }

  console.log('Users seeded.')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
