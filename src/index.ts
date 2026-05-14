import express from 'express'
import dotenv from 'dotenv'
import { handleMessage, checkAndSendReminders } from './handler'

dotenv.config()

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Nihongo no Benkyo WA Bot',
    timestamp: new Date().toISOString(),
  })
})

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body
    console.log('📨 Webhook diterima:', JSON.stringify(body, null, 2))

    const sender = body.sender || body.from || ''
    const message = body.message || body.text || body.msg || ''

    if (!sender || !message) {
      return res.json({ status: 'ignored', reason: 'no sender or message' })
    }

    let phone = sender.toString().replace(/\D/g, '')
    if (!phone.startsWith('62')) {
      phone = '62' + phone
    }
    phone = '+' + phone

    if (body.isFromMe || body.fromMe || sender === 'status') {
      return res.json({ status: 'ignored', reason: 'from self or status' })
    }

    await handleMessage(phone, message)
    res.json({ status: 'ok' })
  } catch (err: any) {
    console.error('❌ Error webhook:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

// ── Cek reminder setiap menit ─────────────────────────────────────────────────
setInterval(async () => {
  await checkAndSendReminders()
}, 60 * 1000) // setiap 1 menit

app.listen(PORT, () => {
  console.log(`🚀 Bot WA Nihongo no Benkyo berjalan di port ${PORT}`)
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`)
  console.log(`⏰ Started at: ${new Date().toLocaleString('id-ID')}`)
  // Langsung cek reminder saat start
  checkAndSendReminders()
})

export default app
