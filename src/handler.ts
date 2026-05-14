import { supabase } from './supabase'
import { sendMessage } from './fonnte'
import {
  getSession,
  updateSession,
  resetSession,
  isOwner,
  SessionState,
} from './sessions'

// ── Helper ────────────────────────────────────────────────────────────────────

function formatTanggal(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function parseTanggal(input: string): string | null {
  const match = input.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
  if (isNaN(d.getTime())) return null
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function parseJam(input: string): string | null {
  const match = input.match(/^(\d{1,2})[:.](\d{2})$/)
  if (!match) return null
  const [, hour, minute] = match
  const h = parseInt(hour)
  const m = parseInt(minute)
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return `${hour.padStart(2, '0')}:${minute}`
}

function menuText(): string {
  return (
    `🤖 *Bot Assistant Nihongo no Benkyo*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Halo Tuan! Ada yang bisa saya bantu? 😊\n\n` +
    `Silakan pilih menu:\n\n` +
    `1️⃣  *Booking Baru*\n` +
    `2️⃣  *Ubah Jadwal Booking*\n` +
    `3️⃣  *List Semua Booking*\n` +
    `4️⃣  *Cari Booking*\n` +
    `5️⃣  *Hapus Booking*\n` +
    `0️⃣  *Keluar / Logout*\n\n` +
    `_Ketik angka untuk memilih menu_`
  )
}

const REMINDER_PHONE = '+6289682037538'

// ── Main Handler ──────────────────────────────────────────────────────────────

export async function handleMessage(phone: string, message: string): Promise<void> {
  const text = message.trim()
  const textLower = text.toLowerCase()
  const session = getSession(phone)

  console.log(`📩 [${phone}] State: ${session.state} | Pesan: ${text}`)

  if (!session.isLoggedIn) {
    await handleLogin(phone, text, session.state)
    return
  }

  if (['0', 'keluar', 'logout', 'exit', 'cancel', 'batal'].includes(textLower)) {
    if (!isOwner(phone)) {
      await supabase.from('bot_sessions').update({ is_logged_in: false }).eq('phone', phone)
      resetSession(phone)
      updateSession(phone, { isLoggedIn: false, state: 'idle' })
      await sendMessage(phone, `✅ Anda telah logout. Sampai jumpa! 👋\n\nKetik apa saja untuk login kembali.`)
    } else {
      resetSession(phone)
      await sendMessage(phone, menuText())
    }
    return
  }

  if (['menu', 'halo', 'hai', 'hi', 'hello', 'help', 'bantuan'].includes(textLower)) {
    updateSession(phone, { state: 'menu', bookingDraft: {}, editDraft: {} })
    await sendMessage(phone, menuText())
    return
  }

  switch (session.state) {
    case 'menu':
    case 'idle':
      await handleMenu(phone, text)
      break
    case 'booking_nama':
      await handleBookingNama(phone, text)
      break
    case 'booking_telepon':
      await handleBookingTelepon(phone, text)
      break
    case 'booking_website':
      await handleBookingWebsite(phone, text)
      break
    case 'booking_tanggal':
      await handleBookingTanggal(phone, text)
      break
    case 'booking_jam':
      await handleBookingJam(phone, text)
      break
    case 'booking_negara':
      await handleBookingNegara(phone, text)
      break
    case 'booking_kota':
      await handleBookingKota(phone, text)
      break
    case 'booking_konfirmasi':
      await handleBookingKonfirmasi(phone, text)
      break
    case 'edit_cari':
      await handleEditCari(phone, text)
      break
    case 'edit_pilih':
      await handleEditPilih(phone, text)
      break
    case 'edit_tanggal':
      await handleEditTanggal(phone, text)
      break
    case 'edit_jam':
      await handleEditJam(phone, text)
      break
    case 'edit_negara':
      await handleEditNegara(phone, text)
      break
    case 'edit_kota':
      await handleEditKota(phone, text)
      break
    case 'edit_konfirmasi':
      await handleEditKonfirmasi(phone, text)
      break
    case 'hapus_cari':
      await handleHapusCari(phone, text)
      break
    case 'hapus_pilih':
      await handleHapusPilih(phone, text)
      break
    case 'hapus_konfirmasi':
      await handleHapusKonfirmasi(phone, text)
      break
    default:
      updateSession(phone, { state: 'menu' })
      await sendMessage(phone, menuText())
  }
}

// ── Login Flow ────────────────────────────────────────────────────────────────

async function handleLogin(phone: string, text: string, state: SessionState) {
  if (state === 'idle') {
    updateSession(phone, { state: 'wait_username' })
    await sendMessage(
      phone,
      `🔐 *Selamat datang di Bot Assistant Nihongo no Benkyo*\n\n` +
      `Nomor Anda belum terdaftar. Silakan login terlebih dahulu.\n\n` +
      `Masukkan *username* Anda:`
    )
    return
  }

  if (state === 'wait_username') {
    updateSession(phone, {
      state: 'wait_password',
      bookingDraft: { nama: text },
    })
    await sendMessage(phone, `Masukkan *password* Anda:`)
    return
  }

  if (state === 'wait_password') {
    const session = getSession(phone)
    const username = session.bookingDraft.nama || ''
    const password = text

    const { data: admin, error } = await supabase
      .from('bot_admins')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single()

    if (error || !admin) {
      updateSession(phone, { state: 'wait_username', bookingDraft: {} })
      await sendMessage(
        phone,
        `❌ Username atau password salah.\n\nSilakan masukkan *username* Anda lagi:`
      )
      return
    }

    await supabase.from('bot_sessions').upsert({
      phone,
      is_logged_in: true,
      last_active: new Date().toISOString(),
    })

    updateSession(phone, {
      isLoggedIn: true,
      state: 'menu',
      bookingDraft: {},
      editDraft: {},
    })

    await sendMessage(
      phone,
      `✅ *Login berhasil!* Selamat datang, *${admin.username}*! 🎉\n\n` + menuText()
    )
  }
}

// ── Menu Handler ──────────────────────────────────────────────────────────────

async function handleMenu(phone: string, text: string) {
  switch (text.trim()) {
    case '1':
      updateSession(phone, { state: 'booking_nama', bookingDraft: {} })
      await sendMessage(
        phone,
        `📝 *BOOKING BARU*\n━━━━━━━━━━━━━━━━\n\n` +
        `Langkah 1/7\n\n` +
        `Masukkan *nama lengkap* peserta:\n\n` +
        `_Ketik "batal" untuk membatalkan_`
      )
      break
    case '2':
      updateSession(phone, { state: 'edit_cari', editDraft: {} })
      await sendMessage(
        phone,
        `✏️ *UBAH JADWAL BOOKING*\n━━━━━━━━━━━━━━━━\n\n` +
        `Masukkan *nama* atau *nomor telepon* peserta yang ingin diubah:\n\n` +
        `_Contoh: "Michael" atau "08123456789"_`
      )
      break
    case '3':
      await handleListBooking(phone)
      break
    case '4':
      updateSession(phone, { state: 'edit_cari', editDraft: { selected: { cariOnly: true } } })
      await sendMessage(
        phone,
        `🔍 *CARI BOOKING*\n━━━━━━━━━━━━━━━━\n\n` +
        `Masukkan *nama* atau *nomor telepon* peserta:`
      )
      break
    case '5':
      updateSession(phone, { state: 'hapus_cari', editDraft: {} })
      await sendMessage(
        phone,
        `🗑️ *HAPUS BOOKING*\n━━━━━━━━━━━━━━━━\n\n` +
        `Masukkan *nama* atau *nomor telepon* peserta yang ingin dihapus:\n\n` +
        `_Contoh: "Michael" atau "08123456789"_`
      )
      break
    default:
      await sendMessage(phone, `❓ Perintah tidak dikenali.\n\n` + menuText())
  }
}

// ── Booking Baru ──────────────────────────────────────────────────────────────

async function handleBookingNama(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', bookingDraft: {} })
    await sendMessage(phone, `❌ Booking dibatalkan.\n\n` + menuText())
    return
  }
  updateSession(phone, {
    state: 'booking_telepon',
    bookingDraft: { ...getSession(phone).bookingDraft, nama: text },
  })
  await sendMessage(
    phone,
    `📝 *BOOKING BARU*\n━━━━━━━━━━━━━━━━\n\n` +
    `Langkah 2/7\n\n` +
    `✅ Nama: *${text}*\n\n` +
    `Masukkan *nomor telepon* peserta:\n\n` +
    `_Contoh: 08123456789_`
  )
}

async function handleBookingTelepon(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', bookingDraft: {} })
    await sendMessage(phone, `❌ Booking dibatalkan.\n\n` + menuText())
    return
  }
  const session = getSession(phone)
  updateSession(phone, {
    state: 'booking_website',
    bookingDraft: { ...session.bookingDraft, nomor_telepon: text },
  })
  await sendMessage(
    phone,
    `📝 *BOOKING BARU*\n━━━━━━━━━━━━━━━━\n\n` +
    `Langkah 3/7\n\n` +
    `✅ Nama: *${session.bookingDraft.nama}*\n` +
    `✅ Telepon: *${text}*\n\n` +
    `Masukkan *nama website* (opsional, ketik "-" jika tidak ada):`
  )
}

async function handleBookingWebsite(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', bookingDraft: {} })
    await sendMessage(phone, `❌ Booking dibatalkan.\n\n` + menuText())
    return
  }
  const session = getSession(phone)
  const website = text === '-' ? '' : text
  updateSession(phone, {
    state: 'booking_tanggal',
    bookingDraft: { ...session.bookingDraft, nama_website: website },
  })
  await sendMessage(
    phone,
    `📝 *BOOKING BARU*\n━━━━━━━━━━━━━━━━\n\n` +
    `Langkah 4/7\n\n` +
    `✅ Nama: *${session.bookingDraft.nama}*\n` +
    `✅ Telepon: *${session.bookingDraft.nomor_telepon}*\n` +
    `✅ Website: *${website || '-'}*\n\n` +
    `Masukkan *tanggal booking*:\n\n` +
    `_Format: DD-MM-YYYY (contoh: 25-12-2025)_`
  )
}

async function handleBookingTanggal(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', bookingDraft: {} })
    await sendMessage(phone, `❌ Booking dibatalkan.\n\n` + menuText())
    return
  }
  const tanggal = parseTanggal(text)
  if (!tanggal) {
    await sendMessage(
      phone,
      `❌ Format tanggal salah!\n\nGunakan format *DD-MM-YYYY*\n_Contoh: 25-12-2025_`
    )
    return
  }
  const session = getSession(phone)
  updateSession(phone, {
    state: 'booking_jam',
    bookingDraft: { ...session.bookingDraft, tanggal_booking: tanggal },
  })
  await sendMessage(
    phone,
    `📝 *BOOKING BARU*\n━━━━━━━━━━━━━━━━\n\n` +
    `Langkah 5/7\n\n` +
    `✅ Tanggal: *${formatTanggal(tanggal)}*\n\n` +
    `Masukkan *jam booking*:\n\n` +
    `_Format: HH:MM (contoh: 09:00 atau 14:30)_`
  )
}

async function handleBookingJam(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', bookingDraft: {} })
    await sendMessage(phone, `❌ Booking dibatalkan.\n\n` + menuText())
    return
  }
  const jam = parseJam(text)
  if (!jam) {
    await sendMessage(
      phone,
      `❌ Format jam salah!\n\nGunakan format *HH:MM*\n_Contoh: 09:00 atau 14:30_`
    )
    return
  }
  const session = getSession(phone)
  updateSession(phone, {
    state: 'booking_negara',
    bookingDraft: { ...session.bookingDraft, jam_booking: jam },
  })
  await sendMessage(
    phone,
    `📝 *BOOKING BARU*\n━━━━━━━━━━━━━━━━\n\n` +
    `Langkah 6/7\n\n` +
    `✅ Tanggal: *${formatTanggal(session.bookingDraft.tanggal_booking!)}*\n` +
    `✅ Jam: *${jam} WIB*\n\n` +
    `Masukkan *negara* peserta:\n\n` +
    `_Contoh: Indonesia, Japan, Vietnam_`
  )
}

async function handleBookingNegara(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', bookingDraft: {} })
    await sendMessage(phone, `❌ Booking dibatalkan.\n\n` + menuText())
    return
  }
  const session = getSession(phone)
  updateSession(phone, {
    state: 'booking_kota',
    bookingDraft: { ...session.bookingDraft, negara: text },
  })
  await sendMessage(
    phone,
    `📝 *BOOKING BARU*\n━━━━━━━━━━━━━━━━\n\n` +
    `Langkah 7/7\n\n` +
    `✅ Negara: *${text}*\n\n` +
    `Masukkan *kota* peserta:\n\n` +
    `_Contoh: Jakarta, Surabaya, Osaka_`
  )
}

async function handleBookingKota(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', bookingDraft: {} })
    await sendMessage(phone, `❌ Booking dibatalkan.\n\n` + menuText())
    return
  }
  const session = getSession(phone)
  const draft = { ...session.bookingDraft, kota: text }
  updateSession(phone, { state: 'booking_konfirmasi', bookingDraft: draft })
  await sendMessage(
    phone,
    `📋 *KONFIRMASI BOOKING*\n━━━━━━━━━━━━━━━━\n\n` +
    `Pastikan data berikut sudah benar:\n\n` +
    `👤 *Nama:* ${draft.nama}\n` +
    `📞 *Telepon:* ${draft.nomor_telepon}\n` +
    `🌐 *Website:* ${draft.nama_website || '-'}\n` +
    `📅 *Tanggal:* ${formatTanggal(draft.tanggal_booking!)}\n` +
    `🕐 *Jam:* ${draft.jam_booking} WIB\n` +
    `🌍 *Negara:* ${draft.negara}\n` +
    `🏙️ *Kota:* ${draft.kota}\n\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `Ketik *"konfirmasi"* untuk menyimpan\n` +
    `Ketik *"batal"* untuk membatalkan`
  )
}

async function handleBookingKonfirmasi(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', bookingDraft: {} })
    await sendMessage(phone, `❌ Booking dibatalkan.\n\n` + menuText())
    return
  }
  if (text.toLowerCase() !== 'konfirmasi') {
    await sendMessage(phone, `⚠️ Ketik *"konfirmasi"* untuk menyimpan atau *"batal"* untuk membatalkan.`)
    return
  }
  const session = getSession(phone)
  const draft = session.bookingDraft
  const { error } = await supabase.from('bookings').insert([{
    nama: draft.nama,
    nomor_telepon: draft.nomor_telepon,
    nama_website: draft.nama_website || null,
    tanggal_booking: draft.tanggal_booking,
    jam_booking: draft.jam_booking || null,
    negara: draft.negara,
    kota: draft.kota,
    created_by: phone,
  }])
  if (error) {
    await sendMessage(phone, `❌ Gagal menyimpan booking.\n\nError: ${error.message}`)
    return
  }
  updateSession(phone, { state: 'menu', bookingDraft: {} })
  await sendMessage(
    phone,
    `✅ *Booking berhasil disimpan!* 🎉\n\n` +
    `📋 *Ringkasan:*\n` +
    `👤 ${draft.nama}\n` +
    `📞 ${draft.nomor_telepon}\n` +
    `📅 ${formatTanggal(draft.tanggal_booking!)}\n` +
    `🕐 ${draft.jam_booking} WIB\n` +
    `🌍 ${draft.negara} - 🏙️ ${draft.kota}\n\n` +
    menuText()
  )
}

// ── Edit Booking ──────────────────────────────────────────────────────────────

async function handleEditCari(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', editDraft: {} })
    await sendMessage(phone, `❌ Dibatalkan.\n\n` + menuText())
    return
  }
  const { data: results } = await supabase
    .from('bookings')
    .select('*')
    .or(`nama.ilike.%${text}%,nomor_telepon.ilike.%${text}%`)
    .order('tanggal_booking', { ascending: true })

  if (!results || results.length === 0) {
    await sendMessage(
      phone,
      `❌ Tidak ada booking ditemukan untuk *"${text}"*.\n\n` +
      `Coba dengan nama lain atau ketik *"menu"* untuk kembali.`
    )
    return
  }

  const session = getSession(phone)
  const cariOnly = session.editDraft?.selected?.cariOnly

  if (cariOnly) {
    let msg = `🔍 *HASIL PENCARIAN: "${text}"*\n━━━━━━━━━━━━━━━━\n\n`
    results.forEach((b, i) => {
      msg +=
        `${i + 1}. *${b.nama}*\n` +
        `   📞 ${b.nomor_telepon}\n` +
        `   🌐 ${b.nama_website || '-'}\n` +
        `   📅 ${formatTanggal(b.tanggal_booking)}\n` +
        `   🕐 ${b.jam_booking || '-'} WIB\n` +
        `   🌍 ${b.negara} - 🏙️ ${b.kota}\n\n`
    })
    msg += `━━━━━━━━━━━━━━━━\nDitemukan *${results.length}* data`
    updateSession(phone, { state: 'menu', editDraft: {} })
    await sendMessage(phone, msg)
    await sendMessage(phone, menuText())
    return
  }

  if (results.length === 1) {
    updateSession(phone, { state: 'edit_tanggal', editDraft: { selected: results[0] } })
    await sendMessage(
      phone,
      `✏️ *EDIT BOOKING*\n━━━━━━━━━━━━━━━━\n\n` +
      `Data yang akan diedit:\n\n` +
      `👤 *Nama:* ${results[0].nama}\n` +
      `📞 *Telepon:* ${results[0].nomor_telepon}\n` +
      `📅 *Tanggal lama:* ${formatTanggal(results[0].tanggal_booking)}\n` +
      `🕐 *Jam lama:* ${results[0].jam_booking || '-'} WIB\n` +
      `🌍 *Negara lama:* ${results[0].negara}\n` +
      `🏙️ *Kota lama:* ${results[0].kota}\n\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `Masukkan *tanggal booking baru*:\n` +
      `_Format: DD-MM-YYYY (ketik "-" jika tidak berubah)_`
    )
    return
  }

  updateSession(phone, { state: 'edit_pilih', editDraft: { searchResults: results } })
  let msg = `✏️ *DITEMUKAN ${results.length} DATA*\n━━━━━━━━━━━━━━━━\n\n`
  results.forEach((b, i) => {
    msg +=
      `${i + 1}. *${b.nama}*\n` +
      `   📞 ${b.nomor_telepon}\n` +
      `   📅 ${formatTanggal(b.tanggal_booking)}\n` +
      `   🕐 ${b.jam_booking || '-'} WIB\n\n`
  })
  msg += `Ketik *nomor* untuk memilih yang akan diedit:`
  await sendMessage(phone, msg)
}

async function handleEditPilih(phone: string, text: string) {
  const session = getSession(phone)
  const results = session.editDraft.searchResults || []
  const idx = parseInt(text) - 1
  if (isNaN(idx) || idx < 0 || idx >= results.length) {
    await sendMessage(phone, `❌ Pilihan tidak valid. Ketik angka 1 sampai ${results.length}:`)
    return
  }
  const selected = results[idx]
  updateSession(phone, { state: 'edit_tanggal', editDraft: { selected } })
  await sendMessage(
    phone,
    `✏️ *EDIT BOOKING*\n━━━━━━━━━━━━━━━━\n\n` +
    `👤 *Nama:* ${selected.nama}\n` +
    `📞 *Telepon:* ${selected.nomor_telepon}\n` +
    `📅 *Tanggal lama:* ${formatTanggal(selected.tanggal_booking)}\n` +
    `🕐 *Jam lama:* ${selected.jam_booking || '-'} WIB\n` +
    `🌍 *Negara lama:* ${selected.negara}\n` +
    `🏙️ *Kota lama:* ${selected.kota}\n\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `Masukkan *tanggal booking baru*:\n` +
    `_Format: DD-MM-YYYY (ketik "-" jika tidak berubah)_`
  )
}

async function handleEditTanggal(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', editDraft: {} })
    await sendMessage(phone, `❌ Edit dibatalkan.\n\n` + menuText())
    return
  }
  const session = getSession(phone)
  let tanggal = session.editDraft.selected?.tanggal_booking
  if (text !== '-') {
    const parsed = parseTanggal(text)
    if (!parsed) {
      await sendMessage(phone, `❌ Format tanggal salah!\n\nGunakan *DD-MM-YYYY* atau ketik *"-"* jika tidak berubah:`)
      return
    }
    tanggal = parsed
  }
  updateSession(phone, { state: 'edit_jam', editDraft: { ...session.editDraft, tanggal_booking: tanggal } })
  await sendMessage(
    phone,
    `✏️ Masukkan *jam baru*:\n\n` +
    `_Jam sekarang: ${session.editDraft.selected?.jam_booking || '-'} WIB_\n` +
    `_Format: HH:MM atau ketik "-" jika tidak berubah_`
  )
}

async function handleEditJam(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', editDraft: {} })
    await sendMessage(phone, `❌ Edit dibatalkan.\n\n` + menuText())
    return
  }
  const session = getSession(phone)
  let jam = session.editDraft.selected?.jam_booking
  if (text !== '-') {
    const parsed = parseJam(text)
    if (!parsed) {
      await sendMessage(phone, `❌ Format jam salah!\n\nGunakan *HH:MM* atau ketik *"-"* jika tidak berubah:`)
      return
    }
    jam = parsed
  }
  updateSession(phone, { state: 'edit_negara', editDraft: { ...session.editDraft, jam_booking: jam } })
  await sendMessage(
    phone,
    `✏️ Masukkan *negara baru*:\n\n` +
    `_Negara sekarang: ${session.editDraft.selected?.negara}_\n` +
    `_Ketik "-" jika tidak berubah_`
  )
}

async function handleEditNegara(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', editDraft: {} })
    await sendMessage(phone, `❌ Edit dibatalkan.\n\n` + menuText())
    return
  }
  const session = getSession(phone)
  const negara = text === '-' ? session.editDraft.selected?.negara : text
  updateSession(phone, { state: 'edit_kota', editDraft: { ...session.editDraft, negara } })
  await sendMessage(
    phone,
    `✏️ Masukkan *kota baru*:\n\n` +
    `_Kota sekarang: ${session.editDraft.selected?.kota}_\n` +
    `_Ketik "-" jika tidak berubah_`
  )
}

async function handleEditKota(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', editDraft: {} })
    await sendMessage(phone, `❌ Edit dibatalkan.\n\n` + menuText())
    return
  }
  const session = getSession(phone)
  const kota = text === '-' ? session.editDraft.selected?.kota : text
  updateSession(phone, { state: 'edit_konfirmasi', editDraft: { ...session.editDraft, kota } })
  const draft = { ...session.editDraft, kota }
  const selected = draft.selected
  await sendMessage(
    phone,
    `📋 *KONFIRMASI PERUBAHAN*\n━━━━━━━━━━━━━━━━\n\n` +
    `*Data lama:*\n` +
    `📅 ${formatTanggal(selected?.tanggal_booking)}\n` +
    `🕐 ${selected?.jam_booking || '-'} WIB\n` +
    `🌍 ${selected?.negara} - 🏙️ ${selected?.kota}\n\n` +
    `*Data baru:*\n` +
    `📅 ${formatTanggal(draft.tanggal_booking!)}\n` +
    `🕐 ${draft.jam_booking || '-'} WIB\n` +
    `🌍 ${draft.negara} - 🏙️ ${kota}\n\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `Ketik *"konfirmasi"* untuk menyimpan\n` +
    `Ketik *"batal"* untuk membatalkan`
  )
}

async function handleEditKonfirmasi(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', editDraft: {} })
    await sendMessage(phone, `❌ Edit dibatalkan.\n\n` + menuText())
    return
  }
  if (text.toLowerCase() !== 'konfirmasi') {
    await sendMessage(phone, `⚠️ Ketik *"konfirmasi"* untuk menyimpan atau *"batal"* untuk membatalkan.`)
    return
  }
  const session = getSession(phone)
  const draft = session.editDraft
  const selected = draft.selected
  const { error } = await supabase
    .from('bookings')
    .update({
      tanggal_booking: draft.tanggal_booking,
      jam_booking: draft.jam_booking || null,
      negara: draft.negara,
      kota: draft.kota,
      updated_at: new Date().toISOString(),
    })
    .eq('id', selected.id)
  if (error) {
    await sendMessage(phone, `❌ Gagal menyimpan perubahan: ${error.message}`)
    return
  }
  updateSession(phone, { state: 'menu', editDraft: {} })
  await sendMessage(
    phone,
    `✅ *Booking berhasil diubah!* 🎉\n\n` +
    `👤 *${selected.nama}*\n` +
    `📅 ${formatTanggal(draft.tanggal_booking!)}\n` +
    `🕐 ${draft.jam_booking || '-'} WIB\n` +
    `🌍 ${draft.negara} - 🏙️ ${draft.kota}\n\n` +
    menuText()
  )
}

// ── Hapus Booking ─────────────────────────────────────────────────────────────

async function handleHapusCari(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', editDraft: {} })
    await sendMessage(phone, `❌ Dibatalkan.\n\n` + menuText())
    return
  }
  const { data: results } = await supabase
    .from('bookings')
    .select('*')
    .or(`nama.ilike.%${text}%,nomor_telepon.ilike.%${text}%`)
    .order('tanggal_booking', { ascending: true })

  if (!results || results.length === 0) {
    await sendMessage(
      phone,
      `❌ Tidak ada booking ditemukan untuk *"${text}"*.\n\n` +
      `Coba dengan nama lain atau ketik *"menu"* untuk kembali.`
    )
    return
  }

  if (results.length === 1) {
    updateSession(phone, { state: 'hapus_konfirmasi', editDraft: { selected: results[0] } })
    const b = results[0]
    await sendMessage(
      phone,
      `🗑️ *HAPUS BOOKING*\n━━━━━━━━━━━━━━━━\n\n` +
      `Data yang akan dihapus:\n\n` +
      `👤 *Nama:* ${b.nama}\n` +
      `📞 *Telepon:* ${b.nomor_telepon}\n` +
      `🌐 *Website:* ${b.nama_website || '-'}\n` +
      `📅 *Tanggal:* ${formatTanggal(b.tanggal_booking)}\n` +
      `🕐 *Jam:* ${b.jam_booking || '-'} WIB\n` +
      `🌍 *Negara:* ${b.negara}\n` +
      `🏙️ *Kota:* ${b.kota}\n\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `⚠️ Ketik *"hapus"* untuk menghapus\n` +
      `Ketik *"batal"* untuk membatalkan`
    )
    return
  }

  updateSession(phone, { state: 'hapus_pilih', editDraft: { searchResults: results } })
  let msg = `🗑️ *DITEMUKAN ${results.length} DATA*\n━━━━━━━━━━━━━━━━\n\n`
  results.forEach((b, i) => {
    msg +=
      `${i + 1}. *${b.nama}*\n` +
      `   📞 ${b.nomor_telepon}\n` +
      `   📅 ${formatTanggal(b.tanggal_booking)}\n` +
      `   🕐 ${b.jam_booking || '-'} WIB\n` +
      `   🌍 ${b.negara} - 🏙️ ${b.kota}\n\n`
  })
  msg += `Ketik *nomor* untuk memilih yang akan dihapus:`
  await sendMessage(phone, msg)
}

async function handleHapusPilih(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', editDraft: {} })
    await sendMessage(phone, `❌ Dibatalkan.\n\n` + menuText())
    return
  }
  const session = getSession(phone)
  const results = session.editDraft.searchResults || []
  const idx = parseInt(text) - 1
  if (isNaN(idx) || idx < 0 || idx >= results.length) {
    await sendMessage(phone, `❌ Pilihan tidak valid. Ketik angka 1 sampai ${results.length}:`)
    return
  }
  const selected = results[idx]
  updateSession(phone, { state: 'hapus_konfirmasi', editDraft: { selected } })
  await sendMessage(
    phone,
    `🗑️ *HAPUS BOOKING*\n━━━━━━━━━━━━━━━━\n\n` +
    `Data yang akan dihapus:\n\n` +
    `👤 *Nama:* ${selected.nama}\n` +
    `📞 *Telepon:* ${selected.nomor_telepon}\n` +
    `🌐 *Website:* ${selected.nama_website || '-'}\n` +
    `📅 *Tanggal:* ${formatTanggal(selected.tanggal_booking)}\n` +
    `🕐 *Jam:* ${selected.jam_booking || '-'} WIB\n` +
    `🌍 *Negara:* ${selected.negara}\n` +
    `🏙️ *Kota:* ${selected.kota}\n\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `⚠️ Ketik *"hapus"* untuk menghapus\n` +
    `Ketik *"batal"* untuk membatalkan`
  )
}

async function handleHapusKonfirmasi(phone: string, text: string) {
  if (text.toLowerCase() === 'batal') {
    updateSession(phone, { state: 'menu', editDraft: {} })
    await sendMessage(phone, `❌ Dibatalkan.\n\n` + menuText())
    return
  }
  if (text.toLowerCase() !== 'hapus') {
    await sendMessage(phone, `⚠️ Ketik *"hapus"* untuk menghapus atau *"batal"* untuk membatalkan.`)
    return
  }
  const session = getSession(phone)
  const selected = session.editDraft.selected
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', selected.id)
  if (error) {
    await sendMessage(phone, `❌ Gagal menghapus booking: ${error.message}`)
    return
  }
  updateSession(phone, { state: 'menu', editDraft: {} })
  await sendMessage(
    phone,
    `✅ *Booking berhasil dihapus!*\n\n` +
    `👤 ${selected.nama} - 📞 ${selected.nomor_telepon}\n` +
    `📅 ${formatTanggal(selected.tanggal_booking)}\n\n` +
    menuText()
  )
}

// ── List Booking ──────────────────────────────────────────────────────────────

async function handleListBooking(phone: string) {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .order('tanggal_booking', { ascending: true })

  if (error || !bookings || bookings.length === 0) {
    updateSession(phone, { state: 'menu' })
    await sendMessage(
      phone,
      `📋 *LIST BOOKING*\n━━━━━━━━━━━━━━━━\n\n` +
      `Belum ada booking yang terdaftar.\n\n` +
      menuText()
    )
    return
  }

  const chunkSize = 10
  const chunks = []
  for (let i = 0; i < bookings.length; i += chunkSize) {
    chunks.push(bookings.slice(i, i + chunkSize))
  }

  await sendMessage(
    phone,
    `📋 *LIST SEMUA BOOKING*\n━━━━━━━━━━━━━━━━\n` +
    `Total: *${bookings.length} peserta*\n━━━━━━━━━━━━━━━━`
  )

  for (let ci = 0; ci < chunks.length; ci++) {
    let msg = ''
    chunks[ci].forEach((b, i) => {
      const no = ci * chunkSize + i + 1
      msg +=
        `*${no}. ${b.nama}*\n` +
        `   📞 ${b.nomor_telepon}\n` +
        `   🌐 ${b.nama_website || '-'}\n` +
        `   📅 ${formatTanggal(b.tanggal_booking)}\n` +
        `   🕐 ${b.jam_booking || '-'} WIB\n` +
        `   🌍 ${b.negara} - 🏙️ ${b.kota}\n\n`
    })
    await sendMessage(phone, msg)
    await new Promise(r => setTimeout(r, 500))
  }

  updateSession(phone, { state: 'menu' })
  await sendMessage(phone, menuText())
}

// ── Pengingat & Auto Hapus Otomatis ──────────────────────────────────────────

export async function checkAndSendReminders(): Promise<void> {
  try {
    const now = new Date()
    const wibOffset = 7 * 60
    const wibNow = new Date(now.getTime() + wibOffset * 60 * 1000)

    const todayStr = wibNow.toISOString().split('T')[0]
    const currentHour = wibNow.getUTCHours()
    const currentMinute = wibNow.getUTCMinutes()
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('tanggal_booking', todayStr)
      .not('jam_booking', 'is', null)

    if (!bookings || bookings.length === 0) return

    // Kelompokkan berdasarkan jam
    const bookingsByTime: Record<string, any[]> = {}
    for (const booking of bookings) {
      if (!booking.jam_booking) continue
      const jamKey = booking.jam_booking.substring(0, 5)
      if (!bookingsByTime[jamKey]) bookingsByTime[jamKey] = []
      bookingsByTime[jamKey].push(booking)
    }

    for (const [jamKey, group] of Object.entries(bookingsByTime)) {
      const [bH, bM] = jamKey.split(':').map(Number)
      const bookingTotalMinutes = bH * 60 + bM
      const nowTotalMinutes = currentHour * 60 + currentMinute

      // Kirim pengingat tepat di jam booking
      if (jamKey === currentTimeStr) {
        let msg =
          `🔔 *PENGINGAT BOOKING HARI INI!*\n━━━━━━━━━━━━━━━━\n\n` +
          `Ada *${group.length}* jadwal booking jam *${jamKey} WIB*:\n\n`

        group.forEach((b, i) => {
          msg +=
            `*${i + 1}. ${b.nama}*\n` +
            `   📞 ${b.nomor_telepon}\n` +
            `   🌐 ${b.nama_website || '-'}\n` +
            `   📅 ${formatTanggal(b.tanggal_booking)}\n` +
            `   🕐 ${b.jam_booking} WIB\n` +
            `   🌍 ${b.negara} - 🏙️ ${b.kota}\n\n`
        })
        msg += `━━━━━━━━━━━━━━━━`

        await sendMessage(REMINDER_PHONE, msg)
        console.log(`🔔 Reminder terkirim jam ${jamKey}: ${group.length} booking`)
      }

      // Auto hapus 1 menit setelah jam booking
      if (nowTotalMinutes === bookingTotalMinutes + 1) {
        const idsToDelete = group.map((b: any) => b.id)
        const { error } = await supabase
          .from('bookings')
          .delete()
          .in('id', idsToDelete)

        if (!error) {
          let delMsg =
            `🗑️ *AUTO HAPUS BOOKING*\n━━━━━━━━━━━━━━━━\n\n` +
            `Booking jam *${jamKey} WIB* telah selesai dan otomatis dihapus:\n\n`

          group.forEach((b, i) => {
            delMsg += `${i + 1}. *${b.nama}* - 📞 ${b.nomor_telepon}\n`
          })

          delMsg += `\n━━━━━━━━━━━━━━━━`
          await sendMessage(REMINDER_PHONE, delMsg)
          console.log(`🗑️ Auto hapus ${idsToDelete.length} booking jam ${jamKey}`)
        }
      }
    }
  } catch (err: any) {
    console.error('❌ Error cek reminder:', err.message)
  }
}
