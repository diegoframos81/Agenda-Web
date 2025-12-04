import express from 'express'
import mongoose from 'mongoose'
import { Reservation } from '../models/Reservation.js'
import { Room } from '../models/Room.js'
import { requireAuth } from '../middleware/auth.js'
import XLSX from 'xlsx'

export const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const { roomId, date } = req.query
    if (!roomId || !date) {
      return res.status(400).json({ error: 'roomId e date são obrigatórios' })
    }
    
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: 'ID da sala inválido' })
    }
    
    const reservations = await Reservation.find({ roomId, date, status: 'active' })
      .select('-cancelCode')
      .sort({ hour: 1 })
    res.json(reservations)
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar reservas' })
  }
})

router.get('/range', async (req, res) => {
  try {
    const { roomId, start, end } = req.query
    if (!roomId || !start || !end) {
      return res.status(400).json({ error: 'roomId, start e end são obrigatórios' })
    }
    
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: 'ID da sala inválido' })
    }
    
    const reservations = await Reservation.find({ 
      roomId, 
      status: 'active', 
      date: { $gte: start, $lte: end } 
    })
      .select('-cancelCode')
      .sort({ date: 1, hour: 1 })
    res.json(reservations)
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar reservas' })
  }
})

router.post('/', async (req, res) => {
  const { roomId, date, hours, name, sector, motive } = req.body
  
  // Validação de campos obrigatórios
  if (!roomId || !date || !Array.isArray(hours) || !name || !sector) {
    return res.status(400).json({ error: 'Payload inválido' })
  }
  
  // Validação de ObjectId
  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return res.status(400).json({ error: 'ID da sala inválido' })
  }
  
  // Validação de array vazio
  if (hours.length === 0) {
    return res.status(400).json({ error: 'Informe pelo menos um horário' })
  }
  
  const room = await Room.findById(roomId)
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
  
  // Verificar se a sala está disponível
  if (room.available === false) {
    return res.status(403).json({ error: 'Sala não está disponível para reservas' })
  }

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
  try {
    const { roomId, date, hour, cancelCode, name } = req.body
    
    // Validação de campos obrigatórios
    if (!roomId || !date || !hour || (!cancelCode && !name)) {
      return res.status(400).json({ error: 'Payload inválido' })
    }
    
    // Validação de ObjectId
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: 'ID da sala inválido' })
    }
    
    const r = await Reservation.findOne({ roomId, date, hour, status: 'active' })
    if (!r) return res.status(404).json({ error: 'Reserva não encontrada' })
    
    // Validação por código ou nome
    if (cancelCode) {
      if (r.cancelCode !== cancelCode) {
        return res.status(403).json({ error: 'Código de cancelamento inválido' })
      }
    } else {
      const a = (name || '').trim().toLowerCase()
      const b = (r.name || '').trim().toLowerCase()
      if (a !== b) {
        return res.status(403).json({ error: 'Nome não confere com a reserva' })
      }
    }
    
    await Reservation.findByIdAndDelete(r._id)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Erro ao cancelar reserva' })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    
    // Validação de ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' })
    }
    
    const r = await Reservation.findById(id)
    if (!r) return res.status(404).json({ error: 'Reserva não encontrada' })
    
    await Reservation.findByIdAndDelete(id)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir reserva' })
  }
})

router.get('/export', requireAuth, async (req, res) => {
  try {
    const { roomId, start, end } = req.query
    if (!roomId || !start || !end) {
      return res.status(400).json({ error: 'roomId, start e end são obrigatórios' })
    }
    
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ error: 'ID da sala inválido' })
    }
    
    const reservations = await Reservation.find({ 
      roomId, 
      date: { $gte: start, $lte: end } 
    }).sort({ date: 1, hour: 1 })
    
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
  } catch (e) {
    res.status(500).json({ error: 'Erro ao exportar reservas' })
  }
})
