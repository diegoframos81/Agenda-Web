import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import { config } from '../config.js'
import { Room } from '../models/Room.js'
import { Reservation } from '../models/Reservation.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function run() {
  const jsonPath = path.resolve(__dirname, '../../agenda-sr-e61b8-default-rtdb-export.json')
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

  await mongoose.connect(config.mongoUri || 'mongodb://localhost:27017/agendaweb')

  const room = await Room.findOneAndUpdate(
    { name: 'Financeiro' },
    { $setOnInsert: { name: 'Financeiro' } },
    { new: true, upsert: true }
  )

  const reservas = data.reservas || {}
  const ops = []
  for (const date of Object.keys(reservas)) {
    const day = reservas[date]
    for (const hour of Object.keys(day)) {
      const { nome, setor } = day[hour]
      ops.push({
        insertOne: {
          document: {
            roomId: room._id,
            date,
            hour,
            name: nome,
            sector: setor,
            motive: undefined,
            cancelCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
            status: 'active',
          },
        },
      })
    }
  }
  if (ops.length) {
    try {
      await Reservation.bulkWrite(ops, { ordered: false })
      console.log(`Importadas ${ops.length} reservas`)
    } catch (e) {
      console.error('Erro ao importar', e.message)
    }
  }
  await mongoose.disconnect()
}

run().catch((e) => {
  console.error('Falha na migração', e)
  process.exit(1)
})
