import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Schema simplificado para inserção direta
const reservationSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: String, required: true },
  hour: { type: String, required: true },
  name: { type: String, required: true },
  sector: { type: String, required: true },
  motive: { type: String },
  cancelCode: { type: String, required: true },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
}, { timestamps: true });

reservationSchema.index({ roomId: 1, date: 1, hour: 1 }, { unique: true });

const Reservation = mongoose.model('Reservation', reservationSchema);

const ROOM_ID = '69273c20caa518c0a66a2221'; // Sala de Reunião - Financeiro
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agendaweb';

async function importFirebaseData() {
  try {
    console.log('[Import] Conectando ao MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[Import] Conectado com sucesso');

    // Ler o arquivo JSON
    const filePath = join(__dirname, '../../agenda-sr-e61b8-default-rtdb-export.json');
    console.log('[Import] Lendo arquivo:', filePath);
    const jsonData = JSON.parse(readFileSync(filePath, 'utf-8'));

    const reservations = [];
    let totalProcessed = 0;
    let totalSkipped = 0;

    // Processar os dados do Firebase
    if (jsonData.reservas) {
      for (const [date, hours] of Object.entries(jsonData.reservas)) {
        for (const [hour, data] of Object.entries(hours)) {
          // Normalizar hora (alguns estão como "10" em vez de "10:00")
          const normalizedHour = hour.includes(':') ? hour : `${hour.padStart(2, '0')}:00`;
          
          // Validar campos obrigatórios
          if (!data.nome || !data.setor) {
            console.log(`[Skip] ${date} ${normalizedHour} - dados incompletos`);
            totalSkipped++;
            continue;
          }

          // Criar código de cancelamento único
          const cancelCode = Math.random().toString(36).slice(2, 8).toUpperCase();

          reservations.push({
            roomId: new mongoose.Types.ObjectId(ROOM_ID),
            date,
            hour: normalizedHour,
            name: data.nome,
            sector: data.setor,
            motive: data.pauta || data.motivo || undefined,
            cancelCode,
            status: 'active',
          });

          totalProcessed++;
        }
      }
    }

    console.log(`\n[Import] Total de reservas processadas: ${totalProcessed}`);
    console.log(`[Import] Total de reservas ignoradas: ${totalSkipped}`);
    console.log(`[Import] Inserindo ${reservations.length} reservas no banco...`);

    if (reservations.length > 0) {
      // Inserir em lotes para evitar duplicatas
      let inserted = 0;
      let duplicates = 0;

      for (const reservation of reservations) {
        try {
          await Reservation.create(reservation);
          inserted++;
          if (inserted % 50 === 0) {
            console.log(`[Import] ${inserted}/${reservations.length} inseridas...`);
          }
        } catch (error) {
          if (error.code === 11000) {
            duplicates++;
          } else {
            console.error(`[Erro] ${reservation.date} ${reservation.hour}:`, error.message);
          }
        }
      }

      console.log(`\n✅ Importação concluída!`);
      console.log(`   - Inseridas: ${inserted}`);
      console.log(`   - Duplicadas (ignoradas): ${duplicates}`);
      console.log(`   - Total no arquivo: ${totalProcessed}`);
    } else {
      console.log('[Import] Nenhuma reserva para inserir');
    }

    await mongoose.connection.close();
    console.log('[Import] Conexão fechada');
  } catch (error) {
    console.error('[Erro Fatal]:', error);
    process.exit(1);
  }
}

importFirebaseData();
