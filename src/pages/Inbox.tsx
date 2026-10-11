import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Phone, PhoneOff, Mic, MicOff, Send, CheckCircle2, RotateCcw, ArrowLeft, MessagesSquare, KeyRound, Building, Info, Volume2 } from 'lucide-react'
import { useStore } from '../data/store'
import { ago, date, time, tzs } from '../lib/format'
import { Avatar, Empty, Thumb } from '../components/ui'
import { GrantModal } from './Tenants'
import type { Conversation } from '../data/types'

type Filter = 'open' | 'unread' | 'mine' | 'resolved'

const QUICK = [
  'Karibu DALALI! Bado ipo, ungependa kuja kuiona?',
  'Yes, it is still available. Would you like to book a viewing?',
  'I have confirmed your payment. Please refresh the listing.',
  'Let me check with the owner and get back to you shortly.',
  'Asante kwa kutumia DALALI 🙏',
]

export default function Inbox() {
  const { db, maps, me, senderLabel, sendMessage, startConversation, updateConversation } = useStore()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('open')
  const [q, setQ] = useState('')
  const [text, setText] = useState('')
  const [calling, setCalling] = useState(false)
  const [grant, setGrant] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const nav = useNavigate()

  // ?tenant=… opens (or starts) a chat with that tenant. The ref stops StrictMode's double effect creating two chats.
  const handled = useRef<string | null>(null)
  useEffect(() => {
    const t = params.get('tenant')
    if (!t || handled.current === t) return
    handled.current = t
    setParams({ c: startConversation(t) }, { replace: true })
  }, [params, setParams, startConversation])

  const activeId = params.get('c')
  const active = db.conversations.find(c => c.id === activeId)
  const last = (c: Conversation) => c.messages[c.messages.length - 1]

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return db.conversations
      .filter(c => filter === 'resolved' ? c.status === 'resolved' : c.status === 'open')
      .filter(c => filter !== 'unread' || c.unread > 0)
      .filter(c => filter !== 'mine' || c.assignedTo === me!.id)
      .filter(c => !term || `${maps.tenant.get(c.tenantId)?.name} ${c.messages.map(m => m.text).join(' ')}`.toLowerCase().includes(term))
      .sort((a, b) => (last(b)?.sentAt ?? '').localeCompare(last(a)?.sentAt ?? ''))
  }, [db.conversations, filter, q, me, maps.tenant])

  // Mark as read when opened
  useEffect(() => { if (active?.unread) updateConversation(active.id, { unread: 0 }) }, [active?.id, active?.unread, updateConversation])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [active?.id, active?.messages.length])

  const tenant = active ? maps.tenant.get(active.tenantId) : undefined
  const listing = active?.listingId ? maps.listing.get(active.listingId) : undefined

  function send(e?: React.FormEvent) {
    e?.preventDefault()
    if (!active || !text.trim()) return
    sendMessage(active.id, text.trim())
    setText('')
  }

  const counts = {
    open: db.conversations.filter(c => c.status === 'open').length,
    unread: db.conversations.filter(c => c.status === 'open' && c.unread > 0).length,
    mine: db.conversations.filter(c => c.status === 'open' && c.assignedTo === me!.id).length,
    resolved: db.conversations.filter(c => c.status === 'resolved').length,
  }

  return (
    <div className={`inbox${active ? ' has-thread' : ''}`}>
      <section className="inbox-list">
        <div className="toolbar" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="search-box" style={{ maxWidth: 'none' }}>
            <Search size={16} />
            <input className="input" placeholder="Search chats" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="chips">
            {(['open', 'unread', 'mine', 'resolved'] as Filter[]).map(f => (
              <button key={f} className={`chip${filter === f ? ' on' : ''}`} style={{ height: 30, padding: '0 10px' }} onClick={() => setFilter(f)}>
                {f === 'mine' ? 'Mine' : f[0].toUpperCase() + f.slice(1)} <span className="n">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="convos">
          {list.map(c => {
            const t = maps.tenant.get(c.tenantId)
            const m = last(c)
            return (
              <button key={c.id} className={`convo${c.id === activeId ? ' on' : ''}${c.unread ? ' unread' : ''}`} onClick={() => setParams({ c: c.id })}>
                <Avatar name={t?.name ?? '?'} />
                <div className="grow">
                  <div className="top"><b className="ellipsis">{t?.name}</b><span className="when">{m ? ago(m.sentAt) : 'new'}</span></div>
                  <div className="row" style={{ gap: 6 }}>
                    <p className="ellipsis grow">{m ? `${m.from === 'admin' ? 'You: ' : ''}${m.text}` : 'No messages yet'}</p>
                    {!!c.unread && <span className="pill">{c.unread}</span>}
                  </div>
                </div>
              </button>
            )
          })}
          {!list.length && <Empty icon={<MessagesSquare size={36} />} title="Nothing here">No {filter} conversations.</Empty>}
        </div>
      </section>

      {active && tenant ? (
        <section className="thread">
          <div className="thread-head">
            <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setParams({})} aria-label="Back"><ArrowLeft size={20} /></button>
            <Avatar name={tenant.name} />
            <div className="grow">
              <b>{tenant.name}</b>
              <div className="small muted ellipsis">{listing ? `About: ${listing.title}` : tenant.phone}</div>
            </div>
            <select className="select hide-sm" style={{ width: 'auto', height: 34 }} value={active.assignedTo ?? ''} onChange={e => updateConversation(active.id, { assignedTo: e.target.value || undefined })} aria-label="Assigned admin">
              <option value="">Unassigned</option>
              {db.admins.filter(a => a.active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" disabled={!db.settings.inAppCalls} title={db.settings.inAppCalls ? 'Call in app' : 'In-app calls are off in Settings'} onClick={() => setCalling(true)}><Phone size={15} /> Call</button>
            {active.status === 'open'
              ? <button className="btn btn-teal btn-sm" onClick={() => updateConversation(active.id, { status: 'resolved' })}><CheckCircle2 size={15} /> Resolve</button>
              : <button className="btn btn-ghost btn-sm" onClick={() => updateConversation(active.id, { status: 'open' })}><RotateCcw size={15} /> Reopen</button>}
          </div>

          <div className="msgs">
            {active.messages.map((m, i) => {
              const prev = active.messages[i - 1]
              const newDay = !prev || new Date(prev.sentAt).toDateString() !== new Date(m.sentAt).toDateString()
              return (
                <div key={m.id} style={{ display: 'contents' }}>
                  {newDay && <div className="day-sep">{date(m.sentAt)}</div>}
                  {m.from === 'system'
                    ? <div className="msg system"><Phone size={12} /> {m.text} · {time(m.sentAt)}</div>
                    : (
                      <div className={`msg ${m.from}`}>
                        <div className="bubble">{m.text}</div>
                        <span className="meta">{m.from === 'admin' ? `${m.senderLabel} · ` : ''}{time(m.sentAt)}</span>
                      </div>
                    )}
                </div>
              )
            })}
            {!active.messages.length && <div className="day-sep">Start the conversation. {tenant.name} will see it in the app.</div>}
            <div ref={endRef} />
          </div>

          <div className="composer">
            <div className="quick-replies">
              {QUICK.map(r => <button key={r} type="button" onClick={() => setText(r)}>{r.length > 38 ? r.slice(0, 38) + '…' : r}</button>)}
            </div>
            <div className="as"><Info size={13} /> Tenant sees this from <b>{senderLabel()}</b></div>
            <form onSubmit={send}>
              <textarea className="textarea" placeholder="Write a message…" value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
              <button className="btn btn-primary" type="submit" disabled={!text.trim()} style={{ height: 42 }}><Send size={17} /> Send</button>
            </form>
          </div>
        </section>
      ) : (
        <section className="thread" style={{ display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
          <Empty icon={<MessagesSquare size={44} />} title="Pick a conversation">Tenant messages from the app show up here.</Empty>
        </section>
      )}

      <aside className="context">
        {active && tenant && (
          <div className="stack" style={{ gap: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <Avatar name={tenant.name} size="lg" />
              <h3 style={{ marginTop: 10, fontSize: 16 }}>{tenant.name}</h3>
              <div className="small muted">{tenant.phone}</div>
              <div className="small muted">Joined {date(tenant.joinedAt)}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => nav(`/tenants?open=${tenant.id}`)}>View tenant profile</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setGrant(true)}><KeyRound size={15} /> Grant free unlock</button>
            {listing && (
              <>
                <div className="section-title" style={{ margin: '8px 0 0' }}>Asking about</div>
                <button className="card" style={{ padding: 10, textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }} onClick={() => nav(`/listings?open=${listing.id}`)}>
                  <Thumb l={listing} />
                  <span className="grow"><b className="small" style={{ display: 'block' }}>{listing.title}</b><span className="small muted">{tzs(listing.price)}</span></span>
                </button>
                <div className="small muted">
                  {db.unlocks.some(u => u.tenantId === tenant.id && u.listingId === listing.id)
                    ? '✓ Has unlocked this listing'
                    : 'Has not unlocked this listing'}
                </div>
              </>
            )}
            <div className="section-title" style={{ margin: '8px 0 0' }}>Assigned</div>
            <div className="small">{active.assignedTo ? maps.admin.get(active.assignedTo)?.name : 'Nobody yet'}</div>
          </div>
        )}
        {!active && <div className="small muted"><Building size={16} /> Tenant details appear here.</div>}
      </aside>

      {calling && tenant && <CallWidget name={tenant.name} tenantId={tenant.id} onEnd={() => setCalling(false)} />}
      {grant && tenant && <GrantModal tenantId={tenant.id} onClose={() => setGrant(false)} />}
    </div>
  )
}

/**
 * Demo call UI. Real in-app calling needs a voice service (e.g. Agora or Twilio Voice) wired into
 * both this dashboard and the Android app; this widget is where that SDK's call would be started.
 */
function CallWidget({ name, tenantId, onEnd }: { name: string; tenantId: string; onEnd: () => void }) {
  const { logCall, senderLabel } = useStore()
  const [secs, setSecs] = useState(0)
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setConnected(true), 2200); return () => clearTimeout(t) }, [])
  useEffect(() => { if (!connected) return; const i = setInterval(() => setSecs(s => s + 1), 1000); return () => clearInterval(i) }, [connected])
  const end = () => { logCall(tenantId, secs, connected ? 'answered' : 'missed'); onEnd() }
  return (
    <div className="call" role="dialog" aria-label={`Call with ${name}`}>
      <span className={connected ? '' : 'ring'} style={{ display: 'inline-block', borderRadius: '50%' }}><Avatar name={name} size="lg" /></span>
      <h3>{name}</h3>
      <p>{connected ? `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')} · as ${senderLabel()}` : 'Ringing in the DALALI app…'}</p>
      <div className="call-btns">
        <button onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <MicOff size={20} /> : <Mic size={20} />}</button>
        <button className="end" onClick={end} aria-label="End call"><PhoneOff size={20} /></button>
        <button aria-label="Speaker"><Volume2 size={20} /></button>
      </div>
      <p style={{ margin: '14px 0 0', fontSize: 11, opacity: .7 }}>Demo call. Live audio needs a voice service connected.</p>
    </div>
  )
}
