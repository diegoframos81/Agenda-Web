import mongoose from 'mongoose'

const reservationSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    hour: { type: String, required: true }, // HH:MM
    name: { type: String, required: true },
    sector: { type: String, required: true },
    motive: { type: String },
    cancelCode: { type: String, required: true },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  },
  { timestamps: true }
)

reservationSchema.index({ roomId: 1, date: 1, hour: 1 }, { unique: true, partialFilterExpression: { status: 'active' } })

export const Reservation = mongoose.model('Reservation', reservationSchema)
