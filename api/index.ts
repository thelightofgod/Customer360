import { connectMongo } from '../server/src/db/mongo'
import app from '../server/src/app'

let connected = false

export default async function handler(req: any, res: any) {
  if (!connected) {
    await connectMongo()
    connected = true
  }
  return app(req, res)
}
