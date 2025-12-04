import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { Admin } from './models/Admin.js'

async function main() {
  try {
    await mongoose.connect(config.mongoUri)
    console.log('[MongoDB] Conectado')

    const email = 'admin@example.com'
    const newPassword = 'superadmin123'

    const admin = await Admin.findOne({ email })
    if (!admin) {
      console.error('Admin não encontrado')
      process.exit(1)
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    admin.passwordHash = passwordHash
    await admin.save()

    console.log('✅ Senha atualizada com sucesso!')
    console.log(`Email: ${admin.email}`)
    console.log(`Nova senha: ${newPassword}`)

    process.exit(0)
  } catch (e) {
    console.error('Erro:', e.message)
    process.exit(1)
  }
}

main()
