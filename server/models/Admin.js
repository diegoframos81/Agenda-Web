import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
)

export const Admin = mongoose.model('Admin', adminSchema)

export async function ensureDefaultAdmin(email, password) {
  const exists = await Admin.findOne({ email })
  if (exists) return exists
  const passwordHash = await bcrypt.hash(password, 10)
  return Admin.create({ email, passwordHash })
}
