import express from 'express'
import mongoose from 'mongoose'
import { Room } from '../models/Room.js'
import { requireAuth } from '../middleware/auth.js'

export const router = express.Router()

router.get('/', async (req, res) => {
  const rooms = await Room.find().sort({ name: 1 })
  res.json(rooms)
})

router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
    res.json(room)
  } catch (e) {
    res.status(404).json({ error: 'Sala não encontrada' })
  }
})

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, capacity, sector, floor, createdBy, available } = req.body
    
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' })
    
    // Validação de capacity se fornecido
    if (capacity !== undefined && (typeof capacity !== 'number' || capacity < 0)) {
      return res.status(400).json({ error: 'Capacidade deve ser um número positivo' })
    }
    
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
    
    // Validação de ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' })
    }
    
    // Validação de capacity se fornecido
    if (capacity !== undefined && (typeof capacity !== 'number' || capacity < 0)) {
      return res.status(400).json({ error: 'Capacidade deve ser um número positivo' })
    }
    
    const room = await Room.findByIdAndUpdate(
      id, 
      { name, capacity, sector, floor, createdBy, available }, 
      { new: true, runValidators: true }
    )
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
  try {
    const { id } = req.params
    
    // Validação de ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' })
    }
    
    const room = await Room.findByIdAndDelete(id)
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir sala' })
  }
})
