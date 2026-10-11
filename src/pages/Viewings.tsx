import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, CalendarClock, MessageSquare, CheckCheck, CalendarDays } from 'lucide-react'
import { useStore } from '../data/store'
import { time } from '../lib/format'
import { Empty, Modal, Thumb, ViewingBadge } from '../components/ui'
import type { Viewing } from '../data/types'

type Tab = 'requested' | 'upcoming' | 'past' | 'cancelled'

export default function Viewings() {
  const { db, maps, setViewing } = useStore()
  const [tab, setTab] = useState<Tab>('requested')
  const [resched, setResched] = useState<Viewing | null>(null)
  const nav = useNavigate()
  const now = Date.now()

  const groups = useMemo(() => {
    const isPast = (v: Viewing) => new Date(v.date).getTime() < now
    const pick: Record<Tab, (v: Viewing) => boolean> = {
      requested: v => v.status === 'requested',
      upcoming: v => v.status === 'confirmed' && !isPast(v),
      past: v => v.status === 'completed' || (v.status === 'confirmed' && isPast(v)),
      cancelled: v => v.status === 'cancelled',
    }
    const list = db.viewings.filter(pick[tab]).sort((a, b) => tab === 'past' || tab === 'cancelled' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))
    const g = new Map<string, Viewing[]>()
    list.forEach(v => {
      const d = new Date(v.date)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - today.getTime()) / 86400_000)
      const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
      g.set(label, [...(g.get(label) ?? []), v])
    })
    return [...g.entries()]
  }, [db.viewings, tab, now])

  const count = (t: Tab) => db.viewings.filter(v =>
    t === 'requested' ? v.status === 'requested'
      : t === 'upcoming' ? v.status === 'confirmed' && new Date(v.date).getTime() >= now
        : t === 'past' ? v.status === 'completed' || (v.status === 'confirmed' && new Date(v.date).getTime() < now)
          : v.status === 'cancelled').length

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>Viewings</h1>
          <p>Requests from tenants to see a property. Confirm, reschedule or cancel.</p>
        </div>
      </div>
      <div className="tabs">
        {(['requested', 'upcoming', 'past', 'cancelled'] as Tab[]).map(t => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'requested' ? 'New requests' : t[0].toUpperCase() + t.slice(1)} <span className="n">{count(t)}</span>
          </button>
        ))}
      </div>

      {groups.map(([label, items]) => (
        <div className="day-group" key={label}>
          <h3>{label}</h3>
          <div className="card">
            {items.map(v => {
              const l = maps.listing.get(v.listingId)
              const t = maps.tenant.get(v.tenantId)
              const past = new Date(v.date).getTime() < now
              return (
                <div className="viewing" key={v.id}>
                  <div className="when"><b>{time(v.date)}</b><span>{new Date(v.date).toLocaleDateString('en-GB', { weekday: 'short' })}</span></div>
                  {l && <Thumb l={l} />}
                  <div className="grow" style={{ minWidth: 200 }}>
                    <div className="cell-main ellipsis">{l?.title ?? 'Deleted listing'}</div>
                    <div className="cell-sub">{t?.name} · {t?.phone}{v.note ? ` · “${v.note}”` : ''}</div>
                  </div>
                  <ViewingBadge s={v.status} />
                  <div className="row-actions" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Message tenant" aria-label="Message tenant" onClick={() => nav(`/inbox?tenant=${v.tenantId}`)}><MessageSquare size={16} /></button>
                    {v.status === 'requested' && <>
                      <button className="btn btn-ghost btn-sm" onClick={() => setResched(v)}><CalendarClock size={15} /> Reschedule</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewing(v.id, { status: 'cancelled' })}><X size={15} /> Decline</button>
                      <button className="btn btn-primary btn-sm" onClick={() => setViewing(v.id, { status: 'confirmed' })}><Check size={15} /> Confirm</button>
                    </>}
                    {v.status === 'confirmed' && !past && <>
                      <button className="btn btn-ghost btn-sm" onClick={() => setResched(v)}><CalendarClock size={15} /> Reschedule</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewing(v.id, { status: 'cancelled' })}><X size={15} /> Cancel</button>
                    </>}
                    {v.status === 'confirmed' && past && <button className="btn btn-teal btn-sm" onClick={() => setViewing(v.id, { status: 'completed' })}><CheckCheck size={15} /> Mark done</button>}
                    {v.status === 'cancelled' && <button className="btn btn-ghost btn-sm" onClick={() => setViewing(v.id, { status: 'requested' })}>Restore</button>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {!groups.length && <div className="card"><Empty icon={<CalendarDays size={40} />} title="Nothing here">No {tab === 'requested' ? 'new requests' : `${tab} viewings`}.</Empty></div>}

      {resched && <Reschedule v={resched} onClose={() => setResched(null)} />}
    </main>
  )
}

function Reschedule({ v, onClose }: { v: Viewing; onClose: () => void }) {
  const { setViewing } = useStore()
  const d = new Date(v.date)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  const [val, setVal] = useState(local)
  return (
    <Modal onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={() => { setViewing(v.id, { date: new Date(val).toISOString(), status: 'confirmed' }); onClose() }}>Save & confirm</button>
    </>}>
      <h2>Reschedule viewing</h2>
      <p className="muted small" style={{ marginTop: 0 }}>The tenant gets a notification with the new time.</p>
      <label className="field"><span>New date and time</span><input className="input" type="datetime-local" value={val} onChange={e => setVal(e.target.value)} /></label>
    </Modal>
  )
}
