export type SessionState =
  | 'idle'
  | 'wait_username'
  | 'wait_password'
  | 'menu'
  // Booking baru
  | 'booking_nama'
  | 'booking_telepon'
  | 'booking_website'
  | 'booking_tanggal'
  | 'booking_jam'
  | 'booking_negara'
  | 'booking_kota'
  | 'booking_konfirmasi'
  // Edit booking
  | 'edit_cari'
  | 'edit_pilih'
  | 'edit_tanggal'
  | 'edit_jam'
  | 'edit_negara'
  | 'edit_kota'
  | 'edit_konfirmasi'
  // Hapus booking
  | 'hapus_cari'
  | 'hapus_pilih'
  | 'hapus_konfirmasi'

export interface BookingDraft {
  nama?: string
  nomor_telepon?: string
  nama_website?: string
  tanggal_booking?: string
  jam_booking?: string
  negara?: string
  kota?: string
}

export interface EditDraft {
  searchResults?: any[]
  selected?: any
  tanggal_booking?: string
  jam_booking?: string
  negara?: string
  kota?: string
}

export interface Session {
  phone: string
  isLoggedIn: boolean
  state: SessionState
  bookingDraft: BookingDraft
  editDraft: EditDraft
  lastActive: Date
}

const sessions = new Map<string, Session>()

const OWNER_PHONES = ['+6289682359973', '+6289682037538']

export function getSession(phone: string): Session {
  if (!sessions.has(phone)) {
    const isOwner = OWNER_PHONES.includes(phone)
    sessions.set(phone, {
      phone,
      isLoggedIn: isOwner,
      state: isOwner ? 'menu' : 'idle',
      bookingDraft: {},
      editDraft: {},
      lastActive: new Date(),
    })
  }
  const session = sessions.get(phone)!
  session.lastActive = new Date()
  return session
}

export function updateSession(phone: string, updates: Partial<Session>) {
  const session = getSession(phone)
  Object.assign(session, updates)
  sessions.set(phone, session)
}

export function resetSession(phone: string) {
  const isOwner = OWNER_PHONES.includes(phone)
  sessions.set(phone, {
    phone,
    isLoggedIn: isOwner,
    state: isOwner ? 'menu' : 'idle',
    bookingDraft: {},
    editDraft: {},
    lastActive: new Date(),
  })
}

export function isOwner(phone: string): boolean {
  return OWNER_PHONES.includes(phone)
}

setInterval(() => {
  const now = new Date()
  sessions.forEach((session, phone) => {
    const diffMinutes = (now.getTime() - session.lastActive.getTime()) / 1000 / 60
    if (diffMinutes > 30 && !isOwner(phone)) {
      sessions.delete(phone)
    }
  })
}, 5 * 60 * 1000)
