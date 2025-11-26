# Agenda-Web (MongoDB + API)

## Instalação

- Node 18+
- Opcional: MongoDB local ou MongoDB Atlas

```
npm install
cd server
npm install
```

## Executar

- API (usa banco em memória se `MONGODB_URI` não estiver definido):

```
npm run api:dev
```

- Front estático:

```
npm run web:dev
```

Abra `http://localhost:5500/`.

## Configurar MongoDB (produção)

Crie `server/.env`:

```
MONGODB_URI=mongodb+srv://usuario:senha@cluster/db
JWT_SECRET=troque-este-segredo
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
PORT=4000
```

## Endpoints

- `GET /api/rooms`
- `POST /api/rooms` (JWT)
- `PUT /api/rooms/:id` (JWT)
- `DELETE /api/rooms/:id` (JWT)

- `GET /api/reservations?roomId=&date=`
- `POST /api/reservations` body `{ roomId, date, hours[], name, sector, motive? }`
- `POST /api/reservations/cancel` body `{ roomId, date, hour, cancelCode }`

- `POST /api/admin/login` body `{ email, password }`

## Migração de dados

```
npm run migrate
```

Importa `agenda-sr-e61b8-default-rtdb-export.json` para a sala "Financeiro".

## Testes

```
cd server
npm test
```

## Observações

- Conflitos de horário são bloqueados por índice único.
- Cancelamento exige `cancelCode` exibido após criar a reserva.
