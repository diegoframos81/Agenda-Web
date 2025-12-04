import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import express from 'express'
import { router as adminRouter } from '../routes/admin.js'
import { router as roomsRouter } from '../routes/rooms.js'
import { router as reservationsRouter } from '../routes/reservations.js'
import { Admin } from '../models/Admin.js'
import { Room } from '../models/Room.js'
import { Reservation } from '../models/Reservation.js'
import bcrypt from 'bcryptjs'

let mongod, app, adminToken

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  app = express()
  app.use(express.json())
  app.use('/api/admin', adminRouter)
  app.use('/api/rooms', roomsRouter)
  app.use('/api/reservations', reservationsRouter)
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

beforeEach(async () => {
  await Admin.deleteMany({})
  await Room.deleteMany({})
  
  // Cria admin padrão para testes
  const passwordHash = await bcrypt.hash('admin123', 10)
  await Admin.create({
    email: 'admin@test.com',
    passwordHash
  })
})

describe('Admin Authentication', () => {
  test('faz login com credenciais corretas', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123'
      })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.token).toBeDefined()
    
    adminToken = res.body.token
  })

  test('rejeita login com senha incorreta', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'admin@test.com',
        password: 'senhaerrada'
      })

    expect(res.status).toBe(401)
    expect(res.body.error).toContain('inválidas')
  })

  test('rejeita login com email inexistente', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'naoexiste@test.com',
        password: 'admin123'
      })

    expect(res.status).toBe(401)
  })
})

describe('Admin Room Management', () => {
  beforeEach(async () => {
    // Faz login para obter token
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123'
      })
    adminToken = loginRes.body.token
  })

  test('cria sala com autenticação', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sala de Reunião',
        sector: 'TI',
        floor: '2º andar',
        createdBy: 'Admin Test',
        available: true,
        capacity: 10
      })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Sala de Reunião')
    expect(res.body.available).toBe(true)
  })

  test('rejeita criação de sala sem autenticação', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .send({
        name: 'Sala de Reunião',
        sector: 'TI'
      })

    expect(res.status).toBe(401)
  })

  test('atualiza disponibilidade da sala', async () => {
    const room = await Room.create({
      name: 'Sala 1',
      sector: 'TI',
      available: true
    })

    const res = await request(app)
      .put(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        available: false
      })

    expect(res.status).toBe(200)
    expect(res.body.available).toBe(false)
  })

  test('atualiza informações completas da sala', async () => {
    const room = await Room.create({
      name: 'Sala 1',
      sector: 'TI',
      available: true
    })

    const res = await request(app)
      .put(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sala Atualizada',
        sector: 'RH',
        floor: '3º andar',
        capacity: 15,
        available: false
      })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Sala Atualizada')
    expect(res.body.sector).toBe('RH')
    expect(res.body.capacity).toBe(15)
  })

  test('exclui sala com autenticação', async () => {
    const room = await Room.create({
      name: 'Sala Temporária',
      sector: 'TI',
      available: true
    })

    const res = await request(app)
      .delete(`/api/rooms/${room._id}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    
    const deleted = await Room.findById(room._id)
    expect(deleted).toBeNull()
  })

  test('rejeita exclusão sem autenticação', async () => {
    const room = await Room.create({
      name: 'Sala 1',
      sector: 'TI'
    })

    const res = await request(app)
      .delete(`/api/rooms/${room._id}`)

    expect(res.status).toBe(401)
  })
})

describe('Admin Reservation Management', () => {
  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123'
      })
    adminToken = loginRes.body.token
  })

  test('exporta reservas em formato XLSX', async () => {
    const room = await Room.create({ name: 'Sala 1', available: true })
    
    // Cria algumas reservas para exportar
    await Reservation.create({
      roomId: room._id,
      date: '2025-12-15',
      hour: '08:00',
      name: 'João Silva',
      sector: 'TI',
      cancelCode: 'ABC123',
      status: 'active'
    })
    await Reservation.create({
      roomId: room._id,
      date: '2025-12-16',
      hour: '10:00',
      name: 'Maria Santos',
      sector: 'RH',
      cancelCode: 'DEF456',
      status: 'active'
    })
    
    const res = await request(app)
      .get(`/api/reservations/export?roomId=${room._id}&start=2025-12-01&end=2025-12-31`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats')
  })

  test('rejeita criação de sala com capacidade inválida', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sala Teste',
        sector: 'TI',
        capacity: -5
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Capacidade deve ser um número positivo')
  })

  test('rejeita atualização com ObjectId inválido', async () => {
    const res = await request(app)
      .put('/api/rooms/invalid-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sala Atualizada'
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('ID inválido')
  })

  test('rejeita exclusão com ObjectId inválido', async () => {
    const res = await request(app)
      .delete('/api/rooms/invalid-id')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('ID inválido')
  })
})
