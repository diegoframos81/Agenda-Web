# Testes do Sistema de Agendamento

## 📋 Visão Geral

Suite de testes automatizados para o sistema de agendamento de salas SAS-IASSEPE.

**Cobertura de Código**: ~74% das linhas testadas

## 🧪 Suites de Testes

### 1. Reservations API (`reservations.test.js`)
Testa funcionalidades relacionadas a reservas de salas:

- ✅ Criação de reservas com sucesso
- ✅ Bloqueio de reservas conflitantes
- ✅ Múltiplas reservas em horários diferentes
- ✅ Busca de reservas por intervalo de datas
- ✅ Cancelamento por nome
- ✅ Cancelamento por código
- ✅ Rejeição de cancelamento com dados incorretos
- ✅ Reutilização de horário após cancelamento
- ✅ Listagem de salas
- ✅ Busca de sala por ID
- ✅ Tratamento de sala inexistente

### 2. Admin API (`admin.test.js`)
Testa funcionalidades administrativas:

**Autenticação:**
- ✅ Login com credenciais corretas
- ✅ Rejeição de senha incorreta
- ✅ Rejeição de email inexistente

**Gerenciamento de Salas:**
- ✅ Criação de sala com autenticação
- ✅ Rejeição sem autenticação
- ✅ Atualização de disponibilidade
- ✅ Atualização completa de informações
- ✅ Exclusão de sala
- ✅ Rejeição de exclusão sem autenticação

**Exportação:**
- ✅ Exportação de reservas em formato XLSX

## 🚀 Como Executar

### Executar todos os testes
```bash
npm test
```

### Executar com modo watch (re-executa ao salvar)
```bash
npm run test:watch
```

### Executar com relatório de cobertura
```bash
npm run test:coverage
```

### Executar com saída detalhada
```bash
npm run test:verbose
```

## 📊 Relatório de Cobertura

```
------------------|---------|----------|---------|---------|
File              | % Stmts | % Branch | % Funcs | % Lines |
------------------|---------|----------|---------|---------|
All files         |   74.26 |    61.84 |   81.25 |   79.66 |
 middleware       |   88.88 |      100 |     100 |    87.5 |
  auth.js         |   88.88 |      100 |     100 |    87.5 |
 models           |   58.33 |        0 |       0 |   63.63 |
  Admin.js        |   28.57 |        0 |       0 |   33.33 |
  Reservation.js  |     100 |      100 |     100 |     100 |
  Room.js         |     100 |      100 |     100 |     100 |
 routes           |   74.78 |    60.29 |   85.71 |    80.8 |
  admin.js        |     100 |      100 |     100 |     100 |
  reservations.js |   71.21 |    66.66 |      75 |   78.57 |
  rooms.js        |   73.68 |    31.25 |     100 |   79.41 |
------------------|---------|----------|---------|---------|
```

## 🔧 Tecnologias Utilizadas

- **Jest**: Framework de testes
- **Supertest**: Testes de API HTTP
- **MongoDB Memory Server**: Banco de dados em memória para testes isolados
- **Mongoose**: ODM para MongoDB
- **bcryptjs**: Hash de senhas

## 📁 Estrutura de Arquivos

```
tests/
├── README.md              # Este arquivo
├── reservations.test.js   # Testes de reservas e salas
└── admin.test.js          # Testes de autenticação e admin
```

## ⚙️ Configuração

A configuração dos testes está em:
- `jest.config.js` - Configurações do Jest
- `package.json` - Scripts de teste

### jest.config.js
```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  testTimeout: 30000,
  verbose: true,
  collectCoverageFrom: [
    'routes/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    '!**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}
```

## 🎯 Próximos Passos

Para melhorar ainda mais a cobertura de testes, considere adicionar:

1. Testes de validação de campos obrigatórios
2. Testes de limites (valores máximos/mínimos)
3. Testes de performance com muitas reservas
4. Testes de concorrência (múltiplas requisições simultâneas)
5. Testes de migração de dados

## 📝 Notas

- Todos os testes usam MongoDB Memory Server, portanto não afetam o banco de dados de produção
- Os testes são executados com ES Modules (flag `--experimental-vm-modules`)
- A autenticação JWT é testada em cada operação administrativa
- O código de cancelamento de 6 caracteres é validado em múltiplos cenários
