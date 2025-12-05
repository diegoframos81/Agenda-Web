import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Reservation } from '../models/Reservation.js'
import { Room } from '../models/Room.js'
import { config } from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function importReservations() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(config.mongoUri)
    console.log('✓ Conectado ao MongoDB')

    // Ler arquivo JSON
    const jsonPath = path.join('/app/data', 'agenda-sr-e61b8-default-rtdb-export.json')
    const rawData = fs.readFileSync(jsonPath, 'utf-8')
    const data = JSON.parse(rawData)

    // Buscar ou criar a sala "Sala de Reunião - Financeiro"
    let room = await Room.findOne({ name: 'Sala de Reunião - Financeiro' })
    if (!room) {
      room = await Room.create({
        name: 'Sala de Reunião - Financeiro',
        sector: 'Financeiro',
        available: true,
      })
      console.log(`✓ Sala criada: ${room.name} (ID: ${room._id})`)
    } else {
      console.log(`✓ Sala encontrada: ${room.name} (ID: ${room._id})`)
    }

    // Processar reservas
    const reservas = data.reservas || {}
    let imported = 0
    let skipped = 0
    let errors = 0

    for (const [date, hoursData] of Object.entries(reservas)) {
      for (const [hour, reservationData] of Object.entries(hoursData)) {
        try {
          const { nome, setor } = reservationData

          // Gerar código de cancelamento aleatório
          const cancelCode = Math.random().toString(36).substr(2, 9).toUpperCase()

          // Verificar se já existe
          const existing = await Reservation.findOne({
            roomId: room._id,
            date,
            hour,
            status: 'active',
          })

          if (existing) {
            skipped++
            continue
          }

          // Criar reserva
          await Reservation.create({
            roomId: room._id,
            date,
            hour,
            name: nome || 'Sem nome',
            sector: setor || 'Sem setor',
            cancelCode,
            status: 'active',
          })

          imported++
        } catch (e) {
          errors++
          console.error(`✗ Erro ao importar ${date} ${hour}:`, e.message)
        }
      }
    }

    console.log(`\n📊 Resumo da Importação:`)
    console.log(`✓ Importadas: ${imported}`)
    console.log(`⊘ Ignoradas (duplicatas): ${skipped}`)
    console.log(`✗ Erros: ${errors}`)

    await mongoose.disconnect()
    console.log(`\n✓ Importação concluída e desconectado do MongoDB`)
  } catch (error) {
    console.error('❌ Erro na importação:', error.message)
    process.exit(1)
  }
}

importReservations()
