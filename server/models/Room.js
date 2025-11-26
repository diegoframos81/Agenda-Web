import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    capacity: { type: Number },
  },
  { timestamps: true }
)

export const Room = mongoose.model('Room', roomSchema)
