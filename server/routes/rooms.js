import express from 'express'
import { Room } from '../models/Room.js'
import { requireAuth } from '../middleware/auth.js'

export const router = express.Router()

router.get('/', async (req, res) => {
  const rooms = await Room.find().sort({ name: 1 })
  res.json(rooms)
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, capacity, sector, floor, createdBy, available } = req.body
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' })
    const room = await Room.create({ name, capacity, sector, floor, createdBy, available })
    res.status(201).json(room)
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: 'Já existe uma sala com esse nome' })
    }
    next(e)
  }
})

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, capacity, sector, floor, createdBy, available } = req.body
    const room = await Room.findByIdAndUpdate(id, { name, capacity, sector, floor, createdBy, available }, { new: true })
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
    res.json(room)
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: 'Já existe uma sala com esse nome' })
    }
    next(e)
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const room = await Room.findByIdAndDelete(id)
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
  res.json({ ok: true })
})
