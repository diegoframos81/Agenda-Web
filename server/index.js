import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import { config } from './config.js'
import { router as roomsRouter } from './routes/rooms.js'
import { router as reservationsRouter } from './routes/reservations.js'
import { router as adminRouter } from './routes/admin.js'
import { ensureDefaultAdmin } from './models/Admin.js'
import { Room } from './models/Room.js'
import { Reservation } from './models/Reservation.js'
import { Admin } from './models/Admin.js'

async function connectMongo() {
  const tryConnect = async (uri, label) => {
    try {
      await mongoose.connect(uri)
      console.log(`[MongoDB] Conectado (${label}) ${uri}`)
      return true
    } catch (e) {
      console.warn(`[MongoDB] Falha ao conectar (${label}):`, e.message)
      return false
    }
  }

  if (config.mongoUri && (await tryConnect(config.mongoUri, 'ENV/LOCAL'))) return

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    const mongod = await MongoMemoryServer.create()
    const uri = mongod.getUri()
    await mongoose.connect(uri)
    console.log('[MongoDB] Usando banco em memória para desenvolvimento')
  } catch (e) {
    console.error('Falha ao iniciar Mongo em memória', e)
    throw e
  }
}

async function bootstrap() {
  await connectMongo()
  await Promise.all([
    Room.syncIndexes(),
    Reservation.syncIndexes(),
    Admin.syncIndexes(),
  ])
  if (process.env.PURGE_RESERVATIONS === '1') {
    await Reservation.deleteMany({})
  }
  await ensureDefaultAdmin(config.adminEmail, config.adminPassword)

  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (req, res) => res.json({ ok: true }))
  app.use('/api/rooms', roomsRouter)
  app.use('/api/reservations', reservationsRouter)
  app.use('/api/admin', adminRouter)

  app.use((err, req, res, next) => {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' })
  })

  app.listen(config.port, () => {
    console.log(`API ouvindo em http://localhost:${config.port}`)
  })
}

bootstrap().catch((e) => {
  console.error('Falha ao iniciar servidor', e)
  process.exit(1)
})
