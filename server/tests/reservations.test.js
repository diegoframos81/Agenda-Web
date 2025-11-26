import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import express from 'express'
import { router as reservationsRouter } from '../routes/reservations.js'
import { router as roomsRouter } from '../routes/rooms.js'
import { Room } from '../models/Room.js'

let mongod, app

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  app = express()
  app.use(express.json())
  app.use('/api/reservations', reservationsRouter)
  app.use('/api/rooms', roomsRouter)
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

test('cria reserva e bloqueia conflito', async () => {
  const room = await Room.create({ name: 'Financeiro' })
  const payload = {
    roomId: room._id.toString(),
    date: '2025-11-25',
    hours: ['08:00'],
    name: 'Teste',
    sector: 'TI',
  }
  const ok = await request(app).post('/api/reservations').send(payload)
  expect(ok.status).toBe(201)
  const conflict = await request(app).post('/api/reservations').send(payload)
  expect(conflict.status).toBe(409)
})
