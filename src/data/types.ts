// Data model shared by the dashboard and (eventually) the Android app's backend.
// Only two roles exist: tenants (app users) and admins (dashboard users).

export type ListingStatus = 'live' | 'draft' | 'hidden' | 'rented'
export type ListingSegment = 'residential' | 'commercial'
export type ListingKind = 'apartment' | 'house' | 'room' | 'studio' | 'office' | 'shop' | 'warehouse'
export type PricePeriod = 'month' | 'year' | 'sale'

export interface Listing {
  id: string
  title: string
  segment: ListingSegment
  kind: ListingKind
  area: string // neighbourhood, e.g. "Mikocheni"
  district: string // e.g. "Kinondoni"
  exactAddress: string // locked until the tenant pays
  price: number // TZS
  period: PricePeriod
  bedrooms: number
  bathrooms: number
  sizeSqm: number
  furnished: boolean
  amenities: string[]
  description: string
  photos: string[]
  ownerName: string // landlord contact, locked until paid
  ownerPhone: string
  unlockPrice: number // TZS the tenant pays to see contact + location
  featured: boolean
  status: ListingStatus
  views: number
  unlocks: number
  createdAt: string
  updatedAt: string
}

export type TenantStatus = 'active' | 'suspended'

export interface Tenant {
  id: string
  name: string
  phone: string
  email?: string
  isGuest: boolean // browsing without an account
  status: TenantStatus
  joinedAt: string
  lastActiveAt: string
  area?: string
  notes?: string
}

export type PaymentMethod = 'M-Pesa' | 'Tigo Pesa' | 'Airtel Money' | 'HaloPesa' | 'Card'
export type PaymentKind = 'unlock' | 'deposit'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Payment {
  id: string
  ref: string
  tenantId: string
  listingId: string
  kind: PaymentKind
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  createdAt: string
  /** Escrow lifecycle, deposits only. */
  escrow?: 'held' | 'released' | 'refunded'
  note?: string
}

/** Access a tenant bought (or was granted) to a listing's locked details. */
export interface Unlock {
  id: string
  tenantId: string
  listingId: string
  paymentId?: string // missing when granted free by an admin
  grantedBy?: string // admin id
  createdAt: string
  expiresAt: string
}

export type ViewingStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled'

export interface Viewing {
  id: string
  tenantId: string
  listingId: string
  date: string // ISO date-time
  status: ViewingStatus
  note?: string
  createdAt: string
}

export interface Message {
  id: string
  from: 'tenant' | 'admin' | 'system'
  adminId?: string
  /** Name shown to the tenant, frozen at send time, e.g. "Evans · DALALI". */
  senderLabel?: string
  text: string
  sentAt: string
}

export interface Conversation {
  id: string
  tenantId: string
  listingId?: string
  status: 'open' | 'resolved'
  assignedTo?: string // admin id
  unread: number
  messages: Message[]
}

export interface CallLog {
  id: string
  tenantId: string
  adminId: string
  direction: 'inbound' | 'outbound'
  outcome: 'answered' | 'missed'
  durationSec: number
  at: string
}

/** Every admin has the same rights: there is no owner or super-admin. */
export interface Admin {
  id: string
  name: string
  email: string
  phone: string
  active: boolean
}

export interface Settings {
  guestBrowsing: boolean
  defaultUnlockPrice: number
  unlockValidityDays: number
  lockedFields: { contact: boolean; exactLocation: boolean; allPhotos: boolean; chat: boolean }
  /** How the admin's name appears to tenants. {name} is replaced. */
  chatNameFormat: string
  depositPercent: number // share of first month held in escrow
  escrowAutoReleaseDays: number
  paymentMethods: Record<PaymentMethod, boolean>
  inAppCalls: boolean
  supportPhone: string
}

export type ActivityKind = 'payment' | 'listing' | 'tenant' | 'viewing' | 'message' | 'escrow' | 'admin'

export interface Activity {
  id: string
  kind: ActivityKind
  text: string
  at: string
  actor?: string
}
