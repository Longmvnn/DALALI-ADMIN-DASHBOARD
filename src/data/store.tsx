// The dashboard's single data source.
//
// Right now it keeps everything in memory (and in localStorage so edits survive a reload).
// When the real backend exists, replace the bodies of the actions below with API calls
// (Firebase, Supabase or a REST server); the pages only talk to `useStore()`, so they won't change.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createSeed, type DB } from './seed'
import type { Activity, ActivityKind, Admin, Listing, Message, Settings, Tenant, ViewingStatus } from './types'

const DB_KEY = 'dalali-admin:db:v2'
const SESSION_KEY = 'dalali-admin:session:v2'

function load(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* fall through to fresh demo data */ }
  return createSeed()
}

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const nowIso = () => new Date().toISOString()

export interface Toast { id: string; text: string; tone?: 'ok' | 'warn' }

function useStoreValue() {
  const [db, setDb] = useState<DB>(load)
  const [me, setMe] = useState<Admin | null>(() => {
    try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
  })
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => { try { localStorage.setItem(DB_KEY, JSON.stringify(db)) } catch { /* storage full or blocked */ } }, [db])
  useEffect(() => {
    try { me ? localStorage.setItem(SESSION_KEY, JSON.stringify(me)) : localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  }, [me])

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = uid('tst')
    setToasts(t => [...t, { id, text, tone }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])

  /** Apply a change to a copy of the DB, optionally logging it to the activity feed. */
  const mutate = useCallback((fn: (d: DB) => void, log?: { kind: ActivityKind; text: string }) => {
    setDb(prev => {
      const d = structuredClone(prev)
      fn(d)
      // Unlock counters are derived from the unlock records so they never drift
      const perListing = new Map<string, number>()
      d.unlocks.forEach(u => perListing.set(u.listingId, (perListing.get(u.listingId) ?? 0) + 1))
      d.listings.forEach(l => { l.unlocks = perListing.get(l.id) ?? 0 })
      if (log) d.activity.unshift({ id: uid('act'), kind: log.kind, text: log.text, at: nowIso(), actor: me?.name } satisfies Activity)
      d.activity = d.activity.slice(0, 200)
      return d
    })
  }, [me])

  const senderLabel = useCallback(
    (admin: Admin | null = me) => db.settings.chatNameFormat.replace('{name}', admin?.name ?? 'DALALI'),
    [db.settings.chatNameFormat, me],
  )

  const actions = useMemo(() => ({
    // ---- session
    signIn(email: string): Admin | null {
      const a = db.admins.find(x => x.email.toLowerCase() === email.trim().toLowerCase() && x.active)
      if (a) setMe(a)
      return a ?? null
    },
    signOut() { setMe(null) },

    // ---- listings
    saveListing(l: Listing) {
      const exists = db.listings.some(x => x.id === l.id)
      mutate(d => {
        const next = { ...l, updatedAt: nowIso() }
        if (exists) d.listings = d.listings.map(x => (x.id === l.id ? next : x))
        else d.listings.unshift(next)
      }, { kind: 'listing', text: `${me?.name} ${exists ? 'updated' : 'created'} ${l.title}` })
      toast(exists ? 'Listing saved' : 'Listing created')
    },
    newListingId: () => uid('lst'),
    setListingStatus(ids: string[], status: Listing['status']) {
      mutate(d => { d.listings.forEach(l => { if (ids.includes(l.id)) { l.status = status; l.updatedAt = nowIso() } }) },
        { kind: 'listing', text: `${me?.name} set ${ids.length} listing${ids.length > 1 ? 's' : ''} to ${status}` })
      toast(`${ids.length} listing${ids.length > 1 ? 's' : ''} marked ${status}`)
    },
    toggleFeatured(id: string) {
      mutate(d => { const l = d.listings.find(x => x.id === id); if (l) l.featured = !l.featured })
    },
    duplicateListing(id: string) {
      const src = db.listings.find(x => x.id === id)
      if (!src) return
      const copy: Listing = { ...structuredClone(src), id: uid('lst'), title: `${src.title} (copy)`, status: 'draft', views: 0, unlocks: 0, featured: false, createdAt: nowIso(), updatedAt: nowIso() }
      mutate(d => { d.listings.unshift(copy) }, { kind: 'listing', text: `${me?.name} duplicated ${src.title}` })
      toast('Copy saved as draft')
      return copy.id
    },
    deleteListings(ids: string[]) {
      mutate(d => { d.listings = d.listings.filter(l => !ids.includes(l.id)) },
        { kind: 'listing', text: `${me?.name} deleted ${ids.length} listing${ids.length > 1 ? 's' : ''}` })
      toast(`${ids.length} listing${ids.length > 1 ? 's' : ''} deleted`, 'warn')
    },

    // ---- tenants
    updateTenant(id: string, patch: Partial<Tenant>) {
      mutate(d => { const t = d.tenants.find(x => x.id === id); if (t) Object.assign(t, patch) })
    },
    setTenantStatus(id: string, status: Tenant['status']) {
      const t = db.tenants.find(x => x.id === id)
      mutate(d => { const x = d.tenants.find(y => y.id === id); if (x) x.status = status },
        { kind: 'tenant', text: `${me?.name} ${status === 'suspended' ? 'suspended' : 'reactivated'} ${t?.name}` })
      toast(status === 'suspended' ? 'Tenant suspended' : 'Tenant reactivated', status === 'suspended' ? 'warn' : 'ok')
    },
    grantUnlock(tenantId: string, listingId: string) {
      const t = db.tenants.find(x => x.id === tenantId)
      const l = db.listings.find(x => x.id === listingId)
      mutate(d => {
        d.unlocks.unshift({
          id: uid('unl'), tenantId, listingId, grantedBy: me?.id, createdAt: nowIso(),
          expiresAt: new Date(Date.now() + d.settings.unlockValidityDays * 86400_000).toISOString(),
        })
      }, { kind: 'tenant', text: `${me?.name} gave ${t?.name} free access to ${l?.title}` })
      toast('Free unlock granted')
    },
    revokeUnlock(unlockId: string) {
      mutate(d => { d.unlocks = d.unlocks.filter(u => u.id !== unlockId) })
      toast('Access removed', 'warn')
    },

    // ---- payments & escrow
    refundPayment(id: string, note?: string) {
      const p = db.payments.find(x => x.id === id)
      mutate(d => {
        const x = d.payments.find(y => y.id === id)
        if (!x) return
        x.status = 'refunded'
        if (x.kind === 'deposit') x.escrow = 'refunded'
        if (note) x.note = note
        if (x.kind === 'unlock') d.unlocks = d.unlocks.filter(u => u.paymentId !== id)
      }, { kind: p?.kind === 'deposit' ? 'escrow' : 'payment', text: `${me?.name} refunded ${p?.ref}` })
      toast('Refund sent to tenant')
    },
    releaseEscrow(id: string) {
      const p = db.payments.find(x => x.id === id)
      mutate(d => { const x = d.payments.find(y => y.id === id); if (x) x.escrow = 'released' },
        { kind: 'escrow', text: `${me?.name} released deposit ${p?.ref} to the landlord` })
      toast('Deposit released to landlord')
    },
    confirmPayment(id: string) {
      const p = db.payments.find(x => x.id === id)
      mutate(d => {
        const x = d.payments.find(y => y.id === id)
        if (!x) return
        x.status = 'paid'
        if (x.kind === 'unlock') d.unlocks.unshift({ id: uid('unl'), tenantId: x.tenantId, listingId: x.listingId, paymentId: x.id, createdAt: nowIso(), expiresAt: new Date(Date.now() + d.settings.unlockValidityDays * 86400_000).toISOString() })
        if (x.kind === 'deposit') x.escrow = 'held'
      }, { kind: 'payment', text: `${me?.name} manually confirmed ${p?.ref}` })
      toast('Payment confirmed')
    },

    // ---- viewings
    setViewing(id: string, patch: { status?: ViewingStatus; date?: string; note?: string }) {
      mutate(d => { const v = d.viewings.find(x => x.id === id); if (v) Object.assign(v, patch) },
        patch.status ? { kind: 'viewing', text: `${me?.name} marked a viewing ${patch.status}` } : undefined)
      toast(patch.date ? 'Viewing rescheduled' : `Viewing ${patch.status}`)
    },

    // ---- inbox
    sendMessage(conversationId: string, text: string) {
      const msg: Message = { id: uid('msg'), from: 'admin', adminId: me?.id, senderLabel: senderLabel(), text, sentAt: nowIso() }
      mutate(d => {
        const c = d.conversations.find(x => x.id === conversationId)
        if (!c) return
        c.messages.push(msg)
        c.unread = 0
        c.status = 'open'
        c.assignedTo ??= me?.id
      })
    },
    startConversation(tenantId: string, listingId?: string) {
      const existing = db.conversations.find(c => c.tenantId === tenantId && (!listingId || c.listingId === listingId))
      if (existing) return existing.id
      const cid = uid('cnv')
      mutate(d => { d.conversations.unshift({ id: cid, tenantId, listingId, status: 'open', assignedTo: me?.id, unread: 0, messages: [] }) })
      return cid
    },
    updateConversation(id: string, patch: { status?: 'open' | 'resolved'; assignedTo?: string; unread?: number }) {
      mutate(d => { const c = d.conversations.find(x => x.id === id); if (c) Object.assign(c, patch) })
      if (patch.status) toast(patch.status === 'resolved' ? 'Marked resolved' : 'Reopened')
    },
    logCall(tenantId: string, durationSec: number, outcome: 'answered' | 'missed') {
      const t = db.tenants.find(x => x.id === tenantId)
      mutate(d => {
        d.calls.unshift({ id: uid('cal'), tenantId, adminId: me!.id, direction: 'outbound', outcome, durationSec, at: nowIso() })
        const c = d.conversations.find(x => x.tenantId === tenantId)
        c?.messages.push({ id: uid('msg'), from: 'system', text: outcome === 'answered' ? `Call with ${senderLabel()} · ${Math.max(1, Math.ceil(durationSec / 60))} min` : 'Missed call', sentAt: nowIso() })
      }, { kind: 'message', text: `${me?.name} called ${t?.name}` })
    },

    // ---- settings & team
    saveSettings(s: Settings) {
      mutate(d => { d.settings = s }, { kind: 'admin', text: `${me?.name} changed app settings` })
      toast('Settings saved')
    },
    saveAdmin(a: Admin) {
      const exists = db.admins.some(x => x.id === a.id)
      mutate(d => {
        if (exists) d.admins = d.admins.map(x => (x.id === a.id ? a : x))
        else d.admins.push(a)
      }, { kind: 'admin', text: `${me?.name} ${exists ? 'updated' : 'added'} admin ${a.name}` })
      if (me && a.id === me.id) setMe(a)
      toast(exists ? 'Admin updated' : 'Admin added')
    },
    newAdminId: () => uid('adm'),
    resetDemo() {
      setDb(createSeed())
      toast('Demo data reset')
    },
  }), [db, me, mutate, senderLabel, toast])

  // Lookup helpers
  const maps = useMemo(() => ({
    tenant: new Map(db.tenants.map(t => [t.id, t])),
    listing: new Map(db.listings.map(l => [l.id, l])),
    admin: new Map(db.admins.map(a => [a.id, a])),
  }), [db.tenants, db.listings, db.admins])

  return { db, me, toasts, toast, senderLabel, maps, ...actions }
}

type Store = ReturnType<typeof useStoreValue>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue()
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used inside <StoreProvider>')
  return s
}
