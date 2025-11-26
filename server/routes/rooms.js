import express from 'express'
import { Room } from '../models/Room.js'
import { requireAuth } from '../middleware/auth.js'

export const router = express.Router()

router.get('/', async (req, res) => {
  const rooms = await Room.find().sort({ name: 1 })
  res.json(rooms)
})

router.post('/', requireAuth, async (req, res) => {
  const { name, capacity } = req.body
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' })
  const room = await Room.create({ name, capacity })
  res.status(201).json(room)
})

router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const { name, capacity } = req.body
  const room = await Room.findByIdAndUpdate(id, { name, capacity }, { new: true })
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
  res.json(room)
})

router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const room = await Room.findByIdAndDelete(id)
  if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
  res.json({ ok: true })
})
