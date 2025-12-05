# Dockerfile para o Backend da Agenda-Web
# Multi-stage build para otimização de imagem

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências (apenas produção)
RUN npm install --omit=dev && npm cache clean --force

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar dependências do stage anterior
COPY --from=builder /app/node_modules ./node_modules

# Copiar código da aplicação
COPY --chown=nodejs:nodejs . .

# Mudar para usuário não-root
USER nodejs

# Expor porta do backend
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/api/rooms', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Comando para iniciar o servidor
CMD ["node", "index.js"]
