// Demo data so every page has something real-looking to show.
// Generated deterministically, with dates relative to "now" so the demo never looks stale.
import type {
  Activity, Admin, CallLog, Conversation, Listing, ListingKind, Payment, PaymentMethod,
  Settings, Tenant, Unlock, Viewing,
} from './types'

export interface DB {
  admins: Admin[]
  tenants: Tenant[]
  listings: Listing[]
  payments: Payment[]
  unlocks: Unlock[]
  viewings: Viewing[]
  conversations: Conversation[]
  calls: CallLog[]
  activity: Activity[]
  settings: Settings
}

// Small seeded RNG (mulberry32) so the demo is the same on every load.
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HOUR = 3600_000
const DAY = 24 * HOUR

export function createSeed(now = Date.now()): DB {
  const r = rng(20261007)
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)]
  const int = (min: number, max: number) => Math.floor(r() * (max - min + 1)) + min
  const ago = (ms: number) => new Date(now - ms).toISOString()
  const id = (p: string, n: number) => `${p}_${String(n).padStart(3, '0')}`

  const admins: Admin[] = [
    { id: 'adm_001', name: 'Evans', email: 'evans@dalali.co.tz', phone: '+255 754 100 200', active: true },
    { id: 'adm_002', name: 'Duffu', email: 'duffu@dalali.co.tz', phone: '+255 713 220 410', active: true },
    { id: 'adm_003', name: 'William', email: 'william@dalali.co.tz', phone: '+255 768 905 331', active: true },
  ]

  const areas: [string, string][] = [
    ['Mikocheni', 'Kinondoni'], ['Masaki', 'Kinondoni'], ['Oyster Bay', 'Kinondoni'], ['Mbezi Beach', 'Kinondoni'],
    ['Sinza', 'Ubungo'], ['Kijitonyama', 'Kinondoni'], ['Mabibo', 'Ubungo'], ['Upanga', 'Ilala'],
    ['Kariakoo', 'Ilala'], ['Tegeta', 'Kinondoni'], ['Goba', 'Ubungo'], ['Kimara', 'Ubungo'],
    ['Msasani', 'Kinondoni'], ['Regent Estate', 'Kinondoni'], ['Mwenge', 'Kinondoni'], ['Kigamboni', 'Kigamboni'],
  ]
  const streets = ['Old Bagamoyo Rd', 'Haile Selassie Rd', 'Chole Rd', 'Mwai Kibaki Rd', 'Shekilango Rd', 'Morogoro Rd', 'Bibi Titi Mohamed St', 'Toure Dr', 'Kawe Rd', 'Mandela Rd']
  const amenityPool = ['Parking', 'Backup water', 'Generator', '24h security', 'Air conditioning', 'Balcony', 'Garden', 'Wi-Fi ready', 'Swimming pool', 'Gym', 'Lift', 'Sea view', 'Fenced', 'Servant quarter']
  const firstNames = ['Amina', 'Juma', 'Rehema', 'Hamisi', 'Zawadi', 'Faraji', 'Mwanaidi', 'Salim', 'Upendo', 'Emmanuel', 'Halima', 'Godfrey', 'Asha', 'Khamis', 'Grace', 'Abdallah', 'Neema', 'Joseph', 'Fatuma', 'Daudi', 'Lightness', 'Said', 'Esther', 'Rashidi', 'Winfrida', 'Omari', 'Happiness', 'Ibrahim', 'Saida', 'Peter']
  const lastNames = ['Mwakyusa', 'Kimaro', 'Massawe', 'Mushi', 'Said', 'Mbwambo', 'Lyimo', 'Shirima', 'Kombo', 'Mrema', 'Nyerere', 'Mollel', 'Swai', 'Temba', 'Komba', 'Haji', 'Makame', 'Urio']
  const owners = ['Baraka Homes', 'Mama Rose', 'Coastal Properties', 'Mzee Athumani', 'Upanga Estates', 'Bahari Living', 'Mr. Ngowi', 'Kilimani Realty']

  // ---- Listings
  const kinds: { kind: ListingKind; seg: 'residential' | 'commercial'; w: number }[] = [
    { kind: 'apartment', seg: 'residential', w: 5 }, { kind: 'house', seg: 'residential', w: 3 },
    { kind: 'room', seg: 'residential', w: 2 }, { kind: 'studio', seg: 'residential', w: 2 },
    { kind: 'office', seg: 'commercial', w: 2 }, { kind: 'shop', seg: 'commercial', w: 2 },
    { kind: 'warehouse', seg: 'commercial', w: 1 },
  ]
  const weighted = kinds.flatMap(k => Array(k.w).fill(k))
  const listings: Listing[] = []
  for (let i = 1; i <= 34; i++) {
    const k = pick(weighted) as (typeof kinds)[number]
    const [area, district] = pick(areas)
    const premium = ['Masaki', 'Oyster Bay', 'Msasani', 'Regent Estate', 'Mikocheni', 'Mbezi Beach'].includes(area)
    const bedrooms = k.seg === 'commercial' ? 0 : k.kind === 'room' || k.kind === 'studio' ? 1 : int(2, 5)
    const base = {
      apartment: 450_000 * bedrooms, house: 600_000 * bedrooms, room: 120_000, studio: 280_000,
      office: 1_400_000, shop: 650_000, warehouse: 3_500_000,
    }[k.kind]
    const price = Math.round((base * (premium ? 2.1 : 1) * (0.8 + r() * 0.5)) / 50_000) * 50_000
    const sizeSqm = k.kind === 'warehouse' ? int(300, 1200) : k.kind === 'office' ? int(60, 250) : k.kind === 'shop' ? int(20, 90) : k.kind === 'room' ? int(12, 20) : int(35, 60) + bedrooms * 22
    const amenities = amenityPool.filter(() => r() < 0.3)
    const created = int(1, 120) * DAY + int(0, 20) * HOUR
    const statusRoll = r()
    const status = statusRoll < 0.68 ? 'live' : statusRoll < 0.8 ? 'rented' : statusRoll < 0.9 ? 'draft' : 'hidden'
    const label = {
      apartment: `${bedrooms} bedroom apartment`, house: `${bedrooms} bedroom house`, room: 'Self-contained room',
      studio: 'Studio apartment', office: 'Office space', shop: 'Shop frame', warehouse: 'Warehouse / godown',
    }[k.kind]
    const views = status === 'draft' ? 0 : int(40, 1400)
    listings.push({
      id: id('lst', i),
      title: `${label} in ${area}`,
      segment: k.seg,
      kind: k.kind,
      area,
      district,
      exactAddress: `Plot ${int(10, 980)}, ${pick(streets)}, ${area}`,
      price,
      period: 'month',
      bedrooms,
      bathrooms: k.seg === 'commercial' ? int(1, 2) : Math.max(1, bedrooms - int(0, 1)),
      sizeSqm,
      furnished: k.seg === 'residential' && r() < 0.35,
      amenities,
      description: k.seg === 'residential'
        ? `Bright ${label.toLowerCase()} close to shops and daladala stops in ${area}. ${amenities.slice(0, 3).join(', ') || 'Quiet compound'}. Tiled floors, modern kitchen and reliable TANESCO meter.`
        : `${label} on a busy road in ${area}, good for a growing business. Easy access for customers and deliveries. ${amenities.slice(0, 2).join(', ')}.`,
      photos: [],
      ownerName: pick(owners),
      ownerPhone: `+255 7${int(10, 89)} ${int(100, 999)} ${int(100, 999)}`,
      unlockPrice: premium ? 10_000 : 5_000,
      featured: status === 'live' && r() < 0.2,
      status,
      views,
      unlocks: Math.floor(views * (0.02 + r() * 0.06)),
      createdAt: ago(created),
      updatedAt: ago(Math.max(HOUR, created - int(0, 20) * DAY)),
    })
  }

  // ---- Tenants
  const tenants: Tenant[] = []
  for (let i = 1; i <= 48; i++) {
    const isGuest = r() < 0.18
    const name = isGuest ? `Guest ${int(1000, 9999)}` : `${pick(firstNames)} ${pick(lastNames)}`
    const joined = int(1, 150) * DAY
    tenants.push({
      id: id('tnt', i),
      name,
      phone: isGuest ? '' : `+255 7${int(10, 89)} ${int(100, 999)} ${int(100, 999)}`,
      email: !isGuest && r() < 0.5 ? `${name.split(' ')[0].toLowerCase()}${int(1, 99)}@gmail.com` : undefined,
      isGuest,
      status: r() < 0.05 ? 'suspended' : 'active',
      joinedAt: ago(joined),
      lastActiveAt: ago(Math.min(joined, int(0, 14) * DAY + int(0, 23) * HOUR)),
      area: pick(areas)[0],
    })
  }
  const registered = tenants.filter(t => !t.isGuest)

  // ---- Payments + unlocks
  const methods: PaymentMethod[] = ['M-Pesa', 'M-Pesa', 'M-Pesa', 'Tigo Pesa', 'Airtel Money', 'HaloPesa', 'Card']
  const liveish = listings.filter(l => l.status !== 'draft')
  const payments: Payment[] = []
  const unlocks: Unlock[] = []
  let p = 1
  for (let d = 0; d < 45; d++) {
    const perDay = int(1, 6) + (d < 14 ? 2 : 0)
    for (let j = 0; j < perDay; j++) {
      const t = pick(registered)
      const l = pick(liveish)
      const at = d * DAY + int(0, 23) * HOUR + int(0, 59) * 60_000
      const roll = r()
      const status = roll < 0.88 ? 'paid' : roll < 0.95 ? 'failed' : d < 1 ? 'pending' : 'refunded'
      const pay: Payment = {
        id: id('pay', p), ref: `DL${(812345 + p * 37).toString(36).toUpperCase()}`,
        tenantId: t.id, listingId: l.id, kind: 'unlock', amount: l.unlockPrice,
        method: pick(methods), status, createdAt: ago(at),
      }
      payments.push(pay)
      if (status === 'paid') {
        unlocks.push({ id: id('unl', p), tenantId: t.id, listingId: l.id, paymentId: pay.id, createdAt: pay.createdAt, expiresAt: new Date(now - at + 30 * DAY).toISOString() })
      }
      p++
    }
  }
  // Escrow deposits
  for (let i = 0; i < 14; i++) {
    const t = pick(registered)
    const l = pick(listings.filter(x => x.segment === 'residential' && x.status !== 'draft'))
    const at = int(0, 40) * DAY + int(1, 20) * HOUR
    const escrow = i < 6 ? 'held' : i < 12 ? 'released' : 'refunded'
    payments.push({
      id: id('pay', p), ref: `DL${(812345 + p * 37).toString(36).toUpperCase()}`,
      tenantId: t.id, listingId: l.id, kind: 'deposit', amount: l.price,
      method: pick(methods), status: escrow === 'refunded' ? 'refunded' : 'paid', escrow, createdAt: ago(at),
      note: escrow === 'refunded' ? 'House did not match listing photos' : undefined,
    })
    p++
  }
  payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  // Keep each listing's unlock counter in line with the unlock records above
  listings.forEach(l => { l.unlocks = unlocks.filter(u => u.listingId === l.id).length })

  // ---- Viewings
  const viewings: Viewing[] = []
  for (let i = 1; i <= 22; i++) {
    const offset = int(-10, 8) * DAY + int(9, 17) * HOUR
    const status = offset > 0 ? (r() < 0.5 ? 'requested' : 'confirmed') : r() < 0.75 ? 'completed' : 'cancelled'
    viewings.push({
      id: id('vwg', i), tenantId: pick(registered).id, listingId: pick(liveish).id,
      date: new Date(new Date(now).setHours(0, 0, 0, 0) + offset).toISOString(),
      status, createdAt: ago(int(1, 12) * DAY),
      note: r() < 0.3 ? 'Prefers an evening visit after work' : undefined,
    })
  }
  viewings.sort((a, b) => a.date.localeCompare(b.date))

  // ---- Conversations
  const opener = [
    'Habari, is this house still available?',
    'Hello, can I see the place this Saturday?',
    'Is the price negotiable?',
    'Does it have backup water? Maji yanakatika sana huku.',
    'Nimelipia ku-unlock lakini sioni namba ya mwenye nyumba.',
    'Can I pay the deposit in two parts?',
    'Is parking included for two cars?',
    'Hi, I want a 2 bedroom near Mwenge under 800k.',
    'Payment went through on M-Pesa but the app still says pending.',
    'Are pets allowed?',
  ]
  const adminReplies = [
    'Karibu! Yes, it is still available. Would you like to book a viewing?',
    'Thanks for reaching out. Let me confirm with the owner and get back to you within the hour.',
    'I have checked and your payment is confirmed. Please refresh the listing.',
    'Sure, Saturday 10am works. I have booked it for you.',
  ]
  const conversations: Conversation[] = []
  for (let i = 1; i <= 16; i++) {
    const t = pick(registered)
    const l = pick(liveish)
    const start = int(0, 9) * DAY + int(2, 20) * HOUR
    const msgs: Conversation['messages'] = [
      { id: `${i}_1`, from: 'tenant', text: pick(opener), sentAt: ago(start) },
    ]
    const replied = i > 5
    if (replied) {
      const a = pick(admins)
      msgs.push({ id: `${i}_2`, from: 'admin', adminId: a.id, senderLabel: `${a.name} · DALALI`, text: pick(adminReplies), sentAt: ago(start - int(5, 50) * 60_000) })
      if (r() < 0.5) msgs.push({ id: `${i}_3`, from: 'tenant', text: pick(['Asante sana!', 'Okay, thank you.', 'What time exactly?', 'Perfect, see you then.']), sentAt: ago(start - 70 * 60_000) })
    }
    conversations.push({
      id: id('cnv', i), tenantId: t.id, listingId: r() < 0.8 ? l.id : undefined,
      status: i > 12 ? 'resolved' : 'open',
      assignedTo: replied ? pick(admins).id : undefined,
      unread: msgs[msgs.length - 1].from === 'tenant' && i <= 12 ? int(1, 3) : 0,
      messages: msgs,
    })
  }
  conversations.sort((a, b) => b.messages[b.messages.length - 1].sentAt.localeCompare(a.messages[a.messages.length - 1].sentAt))

  const calls: CallLog[] = Array.from({ length: 12 }, (_, i) => ({
    id: id('cal', i + 1), tenantId: pick(registered).id, adminId: pick(admins).id,
    direction: r() < 0.6 ? 'inbound' : 'outbound', outcome: r() < 0.8 ? 'answered' : 'missed',
    durationSec: int(20, 420), at: ago(int(0, 10) * DAY + int(0, 23) * HOUR),
  }))

  const tName = (tid: string) => tenants.find(t => t.id === tid)!.name
  const lTitle = (lid: string) => listings.find(l => l.id === lid)!.title
  const activity: Activity[] = [
    ...payments.slice(0, 8).map((x, i): Activity => ({
      id: `act_p${i}`, kind: x.kind === 'deposit' ? 'escrow' : 'payment', at: x.createdAt,
      text: x.kind === 'deposit'
        ? `${tName(x.tenantId)} paid a deposit for ${lTitle(x.listingId)}`
        : x.status === 'paid' ? `${tName(x.tenantId)} unlocked ${lTitle(x.listingId)}` : `Payment ${x.ref} ${x.status}`,
    })),
    ...tenants.slice(0, 4).map((t, i): Activity => ({ id: `act_t${i}`, kind: 'tenant', at: t.joinedAt, text: `${t.name} joined the app` })),
    { id: 'act_l1', kind: 'listing' as const, at: listings[0].updatedAt, actor: 'Duffu', text: `Duffu updated ${listings[0].title}` },
  ].sort((a, b) => b.at.localeCompare(a.at))

  const settings: Settings = {
    guestBrowsing: true,
    defaultUnlockPrice: 5_000,
    unlockValidityDays: 30,
    lockedFields: { contact: true, exactLocation: true, allPhotos: false, chat: false },
    chatNameFormat: '{name} · DALALI',
    depositPercent: 100,
    escrowAutoReleaseDays: 3,
    paymentMethods: { 'M-Pesa': true, 'Tigo Pesa': true, 'Airtel Money': true, HaloPesa: true, Card: false },
    inAppCalls: true,
    supportPhone: '+255 754 100 200',
  }

  return { admins, tenants, listings, payments, unlocks, viewings, conversations, calls, activity, settings }
}
