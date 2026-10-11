import { useEffect, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, X, Building2, Home, BedSingle, Store, Warehouse, Briefcase } from 'lucide-react'
import { useStore } from '../data/store'
import { initials } from '../lib/format'
import type { Listing, ListingStatus, PaymentStatus, ViewingStatus } from '../data/types'

/** The door "D" mark from the brand guide: sand door, amber knob. */
export function Logo({ door = '#EADFCB', knob = '#E58A3A' }: { door?: string; knob?: string }) {
  return (
    <svg viewBox="18 13 122 132" aria-hidden="true">
      <path fill={door} d="M78.76,15.22,21.5,14.75a1.62,1.62,0,0,0-1.63,1.6V116a1.84,1.84,0,0,0,.87,1.54l42.94,25.11a1.4,1.4,0,0,0,2.12-1.23V48.24a1.8,1.8,0,0,0-.92-1.56L42.1,34.11a.9.9,0,0,1,.59-1.71l41.18,7.1A1.63,1.63,0,0,1,85.25,41V125a1.66,1.66,0,0,0,1.84,1.62c30.49-3.43,51.27-25,51.66-55C139.14,38.05,114.49,15.69,78.76,15.22Z" />
      <circle cx="57.2" cy="84.8" r="3.2" fill={knob} />
    </svg>
  )
}

export function Avatar({ name, size, kind }: { name: string; size?: 'sm' | 'lg'; kind?: 'guest' | 'admin' }) {
  return <span className={['avatar', size, kind].filter(Boolean).join(' ')} aria-hidden="true">{kind === 'guest' ? 'G' : initials(name)}</span>
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

export function Drawer({ title, onClose, children, footer, wide, headExtra }: {
  title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; headExtra?: ReactNode
}) {
  useEscape(onClose)
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className={`drawer${wide ? ' wide' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-head">
          <h2>{title}</h2>
          {headExtra}
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>
  )
}

export function Modal({ onClose, children, footer }: { onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEscape(onClose)
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </>
  )
}

export function Confirm({ title, body, confirmLabel = 'Confirm', danger, onConfirm, onClose, children }: {
  title: string; body?: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void; children?: ReactNode
}) {
  return (
    <Modal onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</button>
    </>}>
      <h2>{title}</h2>
      {body && <p className="muted" style={{ margin: 0 }}>{body}</p>}
      {children}
    </Modal>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="toggle">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={e => onChange(e.target.checked)} />
      <span />
    </span>
  )
}

export function SwitchRow({ title, desc, checked, onChange }: { title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="switch">
      <div className="grow"><b>{title}</b>{desc && <span>{desc}</span>}</div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  )
}

export function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.tone ?? ''}`}>
          {t.tone === 'warn' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return <div className="empty">{icon}<b>{title}</b>{children}</div>
}

// ---- Status badges

const listingTone: Record<ListingStatus, string> = { live: 'badge-teal', draft: 'badge-slate', hidden: 'badge-amber', rented: 'badge-navy' }
export const ListingBadge = ({ s }: { s: ListingStatus }) => <span className={`badge ${listingTone[s]}`}>{s}</span>

const payTone: Record<PaymentStatus, string> = { paid: 'badge-teal', pending: 'badge-amber', failed: 'badge-red', refunded: 'badge-slate' }
export const PaymentBadge = ({ s }: { s: PaymentStatus }) => <span className={`badge ${payTone[s]}`}>{s}</span>

const escrowTone = { held: 'badge-amber', released: 'badge-teal', refunded: 'badge-slate' } as const
export const EscrowBadge = ({ s }: { s: keyof typeof escrowTone }) => <span className={`badge ${escrowTone[s]}`}>{s === 'held' ? 'In escrow' : s}</span>

const viewTone: Record<ViewingStatus, string> = { requested: 'badge-amber', confirmed: 'badge-teal', completed: 'badge-slate', cancelled: 'badge-red' }
export const ViewingBadge = ({ s }: { s: ViewingStatus }) => <span className={`badge ${viewTone[s]}`}>{s}</span>

const kindIcon = { apartment: Building2, house: Home, room: BedSingle, studio: BedSingle, office: Briefcase, shop: Store, warehouse: Warehouse }
export function Thumb({ l, arch }: { l: Pick<Listing, 'kind' | 'photos' | 'title'>; arch?: boolean }) {
  const Icon = kindIcon[l.kind]
  return (
    <span className={`thumb${arch ? ' arch' : ''}`}>
      {l.photos[0] ? <img src={l.photos[0]} alt="" /> : <Icon size={20} strokeWidth={1.75} />}
    </span>
  )
}
