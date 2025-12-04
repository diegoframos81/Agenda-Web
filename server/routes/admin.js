import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { Admin } from '../models/Admin.js'

export const router = express.Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const admin = await Admin.findOne({ email })
  if (!admin) return res.status(401).json({ error: 'Credenciais inválidas' })
  const ok = await bcrypt.compare(password, admin.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' })
  const token = jwt.sign({ sub: admin._id, email }, config.jwtSecret, { expiresIn: '8h' })
  res.json({ token })
})

router.post('/create', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }
    const existing = await Admin.findOne({ email })
    if (existing) {
      return res.status(409).json({ error: 'Admin com este email já existe' })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const admin = await Admin.create({ email, passwordHash })
    res.status(201).json({ id: admin._id, email: admin.email })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email e nova senha são obrigatórios' })
    }
    const admin = await Admin.findOne({ email })
    if (!admin) {
      return res.status(404).json({ error: 'Admin não encontrado' })
    }
    const passwordHash = await bcrypt.hash(newPassword, 10)
    admin.passwordHash = passwordHash
    await admin.save()
    res.json({ message: 'Senha atualizada com sucesso', email: admin.email })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
