# 🐳 Guia Docker - Agenda-Web

## Visão Geral

Este projeto está completamente containerizado com Docker e Docker Compose, facilitando o desenvolvimento e deployment.

## 📋 Pré-requisitos

- [Docker](https://www.docker.com/get-started) (versão 20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (versão 2.0+)

## 🚀 Quick Start com Docker

### 1. Iniciar todos os serviços

```bash
docker-compose up -d
```

Este comando iniciará:
- **MongoDB** (porta 27017)
- **Backend API** (porta 4000)
- **Frontend** (porta 3000)

### 2. Verificar status dos containers

```bash
docker-compose ps
```

### 3. Acessar a aplicação

- **Frontend:** http://localhost:3000
- **Admin:** http://localhost:3000/admin/login
- **Backend API:** http://localhost:4000/api

### 4. Parar os serviços

```bash
docker-compose down
```

## 🔧 Comandos Úteis

### Ver logs de todos os serviços

```bash
docker-compose logs -f
```

### Ver logs de um serviço específico

```bash
# Backend
docker-compose logs -f backend

# Frontend
docker-compose logs -f frontend

# MongoDB
docker-compose logs -f mongodb
```

### Reconstruir as imagens

```bash
docker-compose build --no-cache
```

### Reiniciar um serviço específico

```bash
docker-compose restart backend
```

### Executar comandos dentro do container

```bash
# Backend
docker-compose exec backend sh

# MongoDB
docker-compose exec mongodb mongosh agendaweb
```

### Limpar volumes (CUIDADO: apaga dados do banco!)

```bash
docker-compose down -v
```

## 📁 Estrutura Docker

```
Agenda-Web/
├── Dockerfile              # Dockerfile do frontend
├── docker-compose.yml      # Orquestração dos serviços
├── .dockerignore          # Arquivos ignorados pelo Docker
├── .env.example           # Template de variáveis de ambiente
└── server/
    ├── Dockerfile         # Dockerfile do backend
    └── .dockerignore      # Arquivos ignorados (backend)
```

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
cp .env.example .env
```

Principais variáveis:

```env
# JWT Secret (ALTERE EM PRODUÇÃO!)
JWT_SECRET=your-super-secret-jwt-key

# Admin padrão
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=superadmin123

# MongoDB (ajustado automaticamente no Docker)
MONGODB_URI=mongodb://mongodb:27017/agendaweb
```

## 🏗️ Arquitetura dos Containers

### Frontend Container
- **Base:** node:18-alpine
- **Porta:** 3000
- **Função:** Serve arquivos estáticos via `server-frontend.js`
- **Health Check:** HTTP GET http://localhost:3000

### Backend Container
- **Base:** node:18-alpine (multi-stage build)
- **Porta:** 4000
- **Função:** API Express.js com autenticação JWT
- **Health Check:** HTTP GET http://localhost:4000/api/rooms
- **Dependências:** MongoDB

### MongoDB Container
- **Base:** mongo:7
- **Porta:** 27017
- **Volumes:** Dados persistidos em volumes Docker
- **Health Check:** mongosh ping

### Network
Todos os serviços estão conectados via rede `agenda-network` do tipo bridge.

## 📊 Volumes Persistentes

- `mongodb_data`: Dados do banco MongoDB
- `mongodb_config`: Configurações do MongoDB

## 🔍 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs backend

# Reconstruir e reiniciar
docker-compose up -d --build
```

### Erro de conexão com MongoDB

```bash
# Verificar se MongoDB está saudável
docker-compose ps

# Reiniciar MongoDB
docker-compose restart mongodb
```

### Porta já em uso

```bash
# Verificar processos na porta 3000
netstat -ano | findstr :3000

# Ou altere a porta no docker-compose.yml
ports:
  - "8080:3000"  # Usar porta 8080 no host
```

### Resetar tudo

```bash
# Parar containers, remover volumes e reconstruir
docker-compose down -v
docker-compose up -d --build
```

## 🚀 Deploy em Produção

### 1. Build para produção

```bash
docker-compose -f docker-compose.yml build
```

### 2. Variáveis de ambiente seguras

Certifique-se de configurar em produção:

```env
NODE_ENV=production
JWT_SECRET=<secret-forte-aleatorio>
ADMIN_PASSWORD=<senha-forte>
```

### 3. Recomendações

- Use um reverse proxy (nginx/traefik) na frente
- Configure SSL/TLS
- Use secrets do Docker Swarm ou Kubernetes
- Implemente backup automático dos volumes MongoDB
- Configure limites de recursos (CPU/RAM)

## 📝 Desenvolvimento

### Hot Reload (modo desenvolvimento)

O `docker-compose.yml` já está configurado com volumes que mapeiam o código local para os containers, permitindo hot reload durante o desenvolvimento.

### Executar testes no container

```bash
# Entrar no container backend
docker-compose exec backend sh

# Executar testes
npm test
```

## 🔗 Links Úteis

- [Docker Docs](https://docs.docker.com/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

---

**Última atualização:** 05/12/2025
