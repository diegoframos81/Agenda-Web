# Dockerfile para o Frontend da Agenda-Web
# Serve arquivos estáticos via server-frontend.js

FROM node:18-alpine

WORKDIR /app

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar servidor frontend e arquivos públicos
COPY --chown=nodejs:nodejs server-frontend.js ./
COPY --chown=nodejs:nodejs public ./public

# Mudar para usuário não-root
USER nodejs

# Expor porta do frontend
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Comando para iniciar o servidor
CMD ["node", "server-frontend.js"]
