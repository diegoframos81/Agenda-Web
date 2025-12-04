import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import express from 'express'
import { router as reservationsRouter } from '../routes/reservations.js'
import { router as roomsRouter } from '../routes/rooms.js'
import { Room } from '../models/Room.js'
import { Reservation } from '../models/Reservation.js'

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

beforeEach(async () => {
  await Room.deleteMany({})
  await Reservation.deleteMany({})
})

describe('Reservations API', () => {
  test('cria reserva com sucesso', async () => {
    const room = await Room.create({ name: 'Financeiro', available: true })
    const payload = {
      roomId: room._id.toString(),
      date: '2025-12-10',
      hours: ['08:00'],
      name: 'João Silva',
      sector: 'TI',
      motive: 'Reunião de planejamento'
    }
    const res = await request(app).post('/api/reservations').send(payload)
    expect(res.status).toBe(201)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
    expect(res.body[0].name).toBe('João Silva')
    expect(res.body[0].cancelCode).toBeDefined()
    expect(res.body[0].cancelCode).toHaveLength(6)
  })

  test('bloqueia reserva conflitante no mesmo horário', async () => {
    const room = await Room.create({ name: 'Financeiro', available: true })
    const payload = {
      roomId: room._id.toString(),
      date: '2025-12-10',
      hours: ['08:00'],
      name: 'João Silva',
      sector: 'TI',
    }
    const first = await request(app).post('/api/reservations').send(payload)
    expect(first.status).toBe(201)
    
    const conflict = await request(app).post('/api/reservations').send(payload)
    expect(conflict.status).toBe(409)
    expect(conflict.body.error).toContain('já está reservado')
  })

  test('permite múltiplas reservas em horários diferentes', async () => {
    const room = await Room.create({ name: 'Financeiro', available: true })
    const payload1 = {
      roomId: room._id.toString(),
      date: '2025-12-10',
      hours: ['08:00'],
      name: 'João Silva',
      sector: 'TI',
    }
    const payload2 = {
      roomId: room._id.toString(),
      date: '2025-12-10',
      hours: ['10:00'],
      name: 'Maria Santos',
      sector: 'RH',
    }
    const res1 = await request(app).post('/api/reservations').send(payload1)
    const res2 = await request(app).post('/api/reservations').send(payload2)
    expect(res1.status).toBe(201)
    expect(res2.status).toBe(201)
  })

  test('busca reservas por intervalo de datas', async () => {
    const room = await Room.create({ name: 'Financeiro', available: true })
    await Reservation.create({
      roomId: room._id,
      date: '2025-12-10',
      hour: '08:00',
      name: 'João Silva',
      sector: 'TI',
      cancelCode: 'ABC123',
      status: 'active'
    })
    await Reservation.create({
      roomId: room._id,
      date: '2025-12-11',
      hour: '10:00',
      name: 'Maria Santos',
      sector: 'RH',
      cancelCode: 'DEF456',
      status: 'active'
    })

    const res = await request(app)
      .get(`/api/reservations/range?roomId=${room._id}&start=2025-12-10&end=2025-12-11`)
    
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).not.toHaveProperty('cancelCode')
  })

  test('cancela reserva com nome correto', async () => {
    const room = await Room.create({ name: 'Financeiro', available: true })
    const reservation = await Reservation.create({
      roomId: room._id,
      date: '2025-12-10',
      hour: '08:00',
      name: 'João Silva',
      sector: 'TI',
      cancelCode: 'ABC123',
      status: 'active'
    })

    const res = await request(app)
      .post('/api/reservations/cancel')
      .send({
        roomId: room._id.toString(),
        date: '2025-12-10',
        hour: '08:00',
        name: 'João Silva'
      })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('ok')
    
    const deleted = await Reservation.findById(reservation._id)
    expect(deleted).toBeNull()
  })

  test('cancela reserva com código correto', async () => {
    const room = await Room.create({ name: 'Financeiro', available: true })
    const reservation = await Reservation.create({
      roomId: room._id,
      date: '2025-12-10',
      hour: '08:00',
      name: 'João Silva',
      sector: 'TI',
      cancelCode: 'ABC123',
      status: 'active'
    })

    const res = await request(app)
      .post('/api/reservations/cancel')
      .send({
        roomId: room._id.toString(),
        date: '2025-12-10',
        hour: '08:00',
        cancelCode: 'ABC123'
      })

    expect(res.status).toBe(200)
    
    const deleted = await Reservation.findById(reservation._id)
    expect(deleted).toBeNull()
  })

  test('rejeita cancelamento com nome incorreto', async () => {
    const room = await Room.create({ name: 'Financeiro', available: true })
    await Reservation.create({
      roomId: room._id,
      date: '2025-12-10',
      hour: '08:00',
      name: 'João Silva',
      sector: 'TI',
      cancelCode: 'ABC123',
      status: 'active'
    })

    const res = await request(app)
      .post('/api/reservations/cancel')
      .send({
        roomId: room._id.toString(),
        date: '2025-12-10',
        hour: '08:00',
        name: 'Nome Errado'
      })

    expect(res.status).toBe(403)
    expect(res.body.error).toContain('Nome não confere')
  })

  test('permite reservar horário após cancelamento', async () => {
    const room = await Room.create({ name: 'Financeiro', available: true })
    
    // Cria primeira reserva
    const payload = {
      roomId: room._id.toString(),
      date: '2025-12-10',
      hours: ['08:00'],
      name: 'João Silva',
      sector: 'TI',
    }
    const first = await request(app).post('/api/reservations').send(payload)
    expect(first.status).toBe(201)
    
    // Cancela
    await request(app)
      .post('/api/reservations/cancel')
      .send({
        roomId: room._id.toString(),
        date: '2025-12-10',
        hour: '08:00',
        name: 'João Silva'
      })
    
    // Tenta reservar novamente
    const payload2 = {
      roomId: room._id.toString(),
      date: '2025-12-10',
      hours: ['08:00'],
      name: 'Maria Santos',
      sector: 'RH',
    }
    const second = await request(app).post('/api/reservations').send(payload2)
    expect(second.status).toBe(201)
  })

  test('rejeita criação com ObjectId inválido', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .send({
        roomId: 'invalid-id',
        date: '2025-12-10',
        hours: ['08:00'],
        name: 'João Silva',
        sector: 'TI'
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('ID da sala inválido')
  })

  test('rejeita criação com array de horas vazio', async () => {
    const room = await Room.create({ name: 'Financeiro', available: true })
    const res = await request(app)
      .post('/api/reservations')
      .send({
        roomId: room._id.toString(),
        date: '2025-12-10',
        hours: [],
        name: 'João Silva',
        sector: 'TI'
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('pelo menos um horário')
  })

  test('rejeita criação em sala indisponível', async () => {
    const room = await Room.create({ name: 'Financeiro', available: false })
    const res = await request(app)
      .post('/api/reservations')
      .send({
        roomId: room._id.toString(),
        date: '2025-12-10',
        hours: ['08:00'],
        name: 'João Silva',
        sector: 'TI'
      })
    expect(res.status).toBe(403)
    expect(res.body.error).toContain('não está disponível')
  })

  test('rejeita cancelamento com ObjectId inválido', async () => {
    const res = await request(app)
      .post('/api/reservations/cancel')
      .send({
        roomId: 'invalid-id',
        date: '2025-12-10',
        hour: '08:00',
        name: 'João Silva'
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('ID da sala inválido')
  })
})

describe('Rooms API', () => {
  test('lista todas as salas', async () => {
    await Room.create({ name: 'Sala 1', sector: 'TI', available: true })
    await Room.create({ name: 'Sala 2', sector: 'RH', available: false })

    const res = await request(app).get('/api/rooms')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  test('busca sala por ID', async () => {
    const room = await Room.create({ name: 'Financeiro', available: true })
    const res = await request(app).get(`/api/rooms/${room._id}`)
    
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Financeiro')
  })

  test('retorna 404 para sala inexistente', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    const res = await request(app).get(`/api/rooms/${fakeId}`)
    expect(res.status).toBe(404)
  })
})
