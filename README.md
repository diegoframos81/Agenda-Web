# Agenda-Web - Sistema de Agendamento IASSEPE

Sistema de agendamento de salas corporativo com interface moderna e responsiva.

## 📁 Estrutura do Projeto

```
Agenda-Web/
├── public/              # Arquivos públicos (frontend)
│   ├── css/            # Estilos
│   ├── js/             # Scripts JavaScript
│   ├── index.html      # Página principal (calendário)
│   └── admin.html      # Painel administrativo
├── server/             # Backend (API Node.js)
│   ├── models/         # Modelos MongoDB
│   ├── routes/         # Rotas da API
│   ├── middleware/     # Middlewares (autenticação)
│   └── tests/          # Testes unitários
├── docs/               # Documentação do projeto
├── data/               # Dados de exemplo/migração
└── server-frontend.js  # Servidor frontend com roteamento
```

## 🚀 Quick Start

### Pré-requisitos
- Node.js 16+
- MongoDB 5+

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/diegoframos81/Agenda-Web.git
cd Agenda-Web
```

2. **Instale as dependências**
```bash
# Dependências do frontend
npm install

# Dependências do backend
cd server
npm install
cd ..
```

3. **Configure as variáveis de ambiente**
```bash
# Copie o arquivo .env.example para .env no diretório server/
cp server/.env.example server/.env
```

4. **Inicie o MongoDB**
```bash
# Certifique-se de que o MongoDB está rodando em mongodb://127.0.0.1:27017
```

5. **Inicie o projeto**
```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend
npm start
```

O sistema estará disponível em:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Admin Login**: http://localhost:3000/admin/login

## 👤 Credenciais de Admin

- **Email**: `admin@example.com`
- **Senha**: `superadmin123`

## 📋 Scripts Disponíveis

### Frontend
- `npm start` - Inicia o servidor frontend (porta 3000)

### Backend
- `npm start` - Inicia o servidor backend (porta 4000)
- `npm test` - Executa os testes unitários
- `npm run test:coverage` - Executa testes com cobertura

## 🧪 Testes

O projeto possui 28 testes automatizados com ~71% de cobertura de código.

```bash
cd server
npm test
```

Para ver o relatório de cobertura:
```bash
npm run test:coverage
```

## 🎨 Funcionalidades

### Calendário
- ✅ Visualização semanal e mensal
- ✅ Agendamento de salas por horário
- ✅ Cancelamento de reservas
- ✅ Cards de salas na home
- ✅ Interface responsiva (mobile/tablet/desktop)

### Painel Admin
- ✅ Autenticação JWT
- ✅ Gerenciamento de salas
- ✅ Visualização de reservas
- ✅ Exportação de relatórios
- ✅ Controle de disponibilidade

## 📱 Responsividade

O sistema é totalmente responsivo e otimizado para:
- 📱 Smartphones (< 768px)
- 📱 Tablets (768px - 1024px)
- 💻 Desktops (> 1024px)
- 🖥️ Telas 4K

## 🔧 Tecnologias

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- Design responsivo com Media Queries
- Sem frameworks externos

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT para autenticação
- bcrypt para hash de senhas
- Jest para testes

## 📚 Documentação

Consulte a pasta `docs/` para documentação detalhada:
- `GUIA-TESTES.md` - Guia completo de testes
- `RESPONSIVIDADE.md` - Documentação de responsividade
- `QUICK-START.md` - Guia de início rápido

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto é propriedade do SAS-IASSEPE.

## 👥 Autores

- Diego Ramos - [@diegoframos81](https://github.com/diegoframos81)

## 📞 Suporte

Para suporte, abra uma issue no repositório ou entre em contato com a equipe de TI.
