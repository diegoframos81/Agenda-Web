import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    sector: { type: String },
    floor: { type: String },
    createdBy: { type: String },
    capacity: { type: Number },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Room = mongoose.model('Room', roomSchema)
