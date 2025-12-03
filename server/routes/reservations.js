import express from 'express'
import { Reservation } from '../models/Reservation.js'
import { Room } from '../models/Room.js'
import { requireAuth } from '../middleware/auth.js'
import XLSX from 'xlsx'

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
  const { roomId, date, hour, cancelCode, name } = req.body
  if (!roomId || !date || !hour || (!cancelCode && !name)) {
    return res.status(400).json({ error: 'Payload inválido' })
  }
  const r = await Reservation.findOne({ roomId, date, hour, status: 'active' })
  if (!r) return res.status(404).json({ error: 'Reserva não encontrada' })
  if (cancelCode) {
    if (r.cancelCode !== cancelCode) return res.status(403).json({ error: 'Código de cancelamento inválido' })
  } else {
    const a = (name || '').trim().toLowerCase()
    const b = (r.name || '').trim().toLowerCase()
    if (a !== b) return res.status(403).json({ error: 'Nome não confere com a reserva' })
  }
  await Reservation.findByIdAndDelete(r._id)
  res.json({ ok: true })
})

router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const r = await Reservation.findById(id)
  if (!r) return res.status(404).json({ error: 'Reserva não encontrada' })
  await Reservation.findByIdAndDelete(id)
  res.json({ ok: true })
})

router.get('/export', requireAuth, async (req, res) => {
  const { roomId, start, end } = req.query
  if (!roomId || !start || !end) return res.status(400).json({ error: 'roomId, start e end são obrigatórios' })
  const reservations = await Reservation.find({ roomId, date: { $gte: start, $lte: end } }).sort({ date: 1, hour: 1 })
  const rows = reservations.map(r => ({
    Sala: r.roomId.toString(),
    Data: r.date,
    Hora: r.hour,
    Nome: r.name,
    Setor: r.sector,
    Motivo: r.motive || '',
    Status: r.status,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Agendamentos')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="agendamentos-${start}_a_${end}.xlsx"`)
  res.send(buf)
})
