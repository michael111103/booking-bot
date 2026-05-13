import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const FONNTE_TOKEN = process.env.FONNTE_TOKEN!

export async function sendMessage(phone: string, message: string): Promise<void> {
  try {
    // Format nomor: hilangkan + di depan
    const cleanPhone = phone.replace('+', '')

    await axios.post(
      'https://api.fonnte.com/send',
      {
        target: cleanPhone,
        message: message,
        countryCode: '62',
      },
      {
        headers: {
          Authorization: FONNTE_TOKEN,
        },
      }
    )
    console.log(`✅ Pesan terkirim ke ${phone}`)
  } catch (err: any) {
    console.error(`❌ Gagal kirim pesan ke ${phone}:`, err.message)
  }
}
