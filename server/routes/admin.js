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
