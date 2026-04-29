import { MongoClient, Db } from 'mongodb'

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://keremuslu_db_user:<db_password>@bitechnologydata.qcpbyxy.mongodb.net/?appName=BiTechnologyData'
const DB_NAME = process.env.MONGO_DB || 'BiTechnologyData'

let client: MongoClient | null = null
let _db: Db | null = null

export async function connectMongo(): Promise<Db> {
  if (_db) return _db
  client = new MongoClient(MONGO_URI)
  await client.connect()
  _db = client.db(DB_NAME)
  console.log(`MongoDB connected → ${DB_NAME}`)
  return _db
}

export function getMongo(): Db {
  if (!_db) throw new Error('MongoDB not connected — call connectMongo() first')
  return _db
}
