import express from 'express'
import { Reservation } from '../models/Reservation.js'
import { Room } from '../models/Room.js'

export const router = express.Router()

router.get('/', async (req, res) => {
  const { roomId, date } = req.query
  if (!roomId || !date) return res.status(400).json({ error: 'roomId e date são obrigatórios' })
  const reservations = await Reservation.find({ roomId, date, status: 'active' }).select('-cancelCode').sort({ hour: 1 })
  res.json(reservations)
})

router.get('/range', async (req, res) => {
  const { roomId, start, end } = req.query
  if (!roomId || !start || !end) return res.status(400).json({ error: 'roomId, start e end são obrigatórios' })
  const reservations = await Reservation.find({ roomId, status: 'active', date: { $gte: start, $lte: end } }).select('-cancelCode').sort({ date: 1, hour: 1 })
  res.json(reservations)
})

router.post('/', async (req, res) => {
  const { roomId, date, hours, name, sector, motive } = req.body
  if (!roomId || !date || !Array.isArray(hours) || !name || !sector) {
    return res.status(400).json({ error: 'Payload inválido' })
  }
  const room = await Room.findById(roomId)
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' })

  const ops = hours.map((hour) => ({
    insertOne: {
      document: {
        roomId,
        date,
        hour,
        name,
        sector,
        motive,
        cancelCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
        status: 'active',
      },
    },
  }))

  try {
    await Reservation.bulkWrite(ops, { ordered: true })
    const created = await Reservation.find({ roomId, date, hour: { $in: hours } })
    return res.status(201).json(created)
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: 'Conflito: algum horário já está reservado' })
    }
    throw e
  }
})

router.post('/cancel', async (req, res) => {
  const { roomId, date, hour, cancelCode } = req.body
  if (!roomId || !date || !hour || !cancelCode) {
    return res.status(400).json({ error: 'Payload inválido' })
  }
  const r = await Reservation.findOne({ roomId, date, hour })
  if (!r) return res.status(404).json({ error: 'Reserva não encontrada' })
  if (r.cancelCode !== cancelCode) {
    return res.status(403).json({ error: 'Código de cancelamento inválido' })
  }
  r.status = 'cancelled'
  await r.save()
  res.json({ ok: true })
})
