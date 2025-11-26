import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Sem token' })
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.user = payload
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}
