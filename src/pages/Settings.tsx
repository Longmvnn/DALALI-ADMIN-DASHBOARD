import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus, Pencil, RotateCcw, Save } from 'lucide-react'
import { useStore } from '../data/store'
import { tzs } from '../lib/format'
import { Avatar, Confirm, Modal, SwitchRow } from '../components/ui'
import { useTheme } from '../components/Layout'
import type { Admin, PaymentMethod, Settings } from '../data/types'

type Tab = 'general' | 'pricing' | 'payments' | 'chat' | 'team'
const TABS: [Tab, string][] = [['general', 'General'], ['pricing', 'Pricing & unlocks'], ['payments', 'Payments & escrow'], ['chat', 'Chat & calls'], ['team', 'Admin team']]

export default function SettingsPage() {
  const { db, me, saveSettings, resetDemo } = useStore()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'general'
  const [s, setS] = useState<Settings>(() => structuredClone(db.settings))
  const [theme, setTheme] = useTheme()
  const [reset, setReset] = useState(false)
  const dirty = JSON.stringify(s) !== JSON.stringify(db.settings)
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS(x => ({ ...x, [k]: v }))

  return (
    <main className="content" style={{ maxWidth: 920 }}>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>How the DALALI app behaves for tenants. Changes apply to the app after you save.</p>
        </div>
        {tab !== 'team' && (
          <div className="actions">
            <button className="btn btn-ghost" disabled={!dirty} onClick={() => setS(structuredClone(db.settings))}>Discard</button>
            <button className="btn btn-primary" disabled={!dirty} onClick={() => saveSettings(s)}><Save size={17} /> Save changes</button>
          </div>
        )}
      </div>

      <div className="tabs">
        {TABS.map(([k, label]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setParams(k === 'general' ? {} : { tab: k })}>{label}</button>)}
      </div>

      {tab === 'general' && (
        <div className="stack">
          <section className="card card-pad">
            <SwitchRow title="Guest browsing" desc="Let people open the app and browse listings without creating an account. They're asked to sign up and pay when they try to unlock a property." checked={s.guestBrowsing} onChange={v => set('guestBrowsing', v)} />
            <div className="switch">
              <div className="grow"><b>Support phone</b><span>Shown in the app's Help screen.</span></div>
              <input className="input" style={{ maxWidth: 220 }} value={s.supportPhone} onChange={e => set('supportPhone', e.target.value)} />
            </div>
          </section>
          <section className="card card-pad">
            <div className="switch">
              <div className="grow"><b>Dashboard appearance</b><span>Only affects this browser.</span></div>
              <div className="chips">
                {(['system', 'light', 'dark'] as const).map(t => <button key={t} className={`chip${theme === t ? ' on' : ''}`} onClick={() => setTheme(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
              </div>
            </div>
            <div className="switch">
              <div className="grow"><b>Reset demo data</b><span>Puts back the sample listings, tenants and payments. Only for this demo.</span></div>
              <button className="btn btn-danger btn-sm" onClick={() => setReset(true)}><RotateCcw size={15} /> Reset</button>
            </div>
          </section>
        </div>
      )}

      {tab === 'pricing' && (
        <div className="stack">
          <section className="card card-pad stack">
            <div className="grid-2">
              <label className="field"><span>Default unlock price (TZS)</span>
                <input className="input mono" inputMode="numeric" value={s.defaultUnlockPrice.toLocaleString('en-US')} onChange={e => set('defaultUnlockPrice', Number(e.target.value.replace(/\D/g, '')) || 0)} />
                <small>Used for new listings. You can change it per listing.</small>
              </label>
              <label className="field"><span>Access lasts (days)</span>
                <input className="input" type="number" min={1} value={s.unlockValidityDays} onChange={e => set('unlockValidityDays', +e.target.value)} />
                <small>How long a tenant keeps access after paying.</small>
              </label>
            </div>
          </section>
          <section className="card card-pad">
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>What tenants must pay to see</h2>
            <p className="small muted" style={{ marginTop: 0 }}>Everything else (price, area, size, cover photo) stays free so listings still look good to guests.</p>
            <SwitchRow title="Owner's name and phone number" checked={s.lockedFields.contact} onChange={v => set('lockedFields', { ...s.lockedFields, contact: v })} />
            <SwitchRow title="Exact address and map pin" checked={s.lockedFields.exactLocation} onChange={v => set('lockedFields', { ...s.lockedFields, exactLocation: v })} />
            <SwitchRow title="All photos (only the cover is free)" checked={s.lockedFields.allPhotos} onChange={v => set('lockedFields', { ...s.lockedFields, allPhotos: v })} />
            <SwitchRow title="Chat with DALALI about the listing" checked={s.lockedFields.chat} onChange={v => set('lockedFields', { ...s.lockedFields, chat: v })} />
          </section>
          <div className="notice">
            <span>💡</span>
            <div>Tenants see: <b>“Unlock this home for {tzs(s.defaultUnlockPrice)}”</b>, then pay by mobile money. Access lasts {s.unlockValidityDays} days.</div>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="stack">
          <section className="card card-pad">
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Payment methods in the app</h2>
            {(Object.keys(s.paymentMethods) as PaymentMethod[]).map(m => (
              <SwitchRow key={m} title={m} checked={s.paymentMethods[m]} onChange={v => set('paymentMethods', { ...s.paymentMethods, [m]: v })} />
            ))}
          </section>
          <section className="card card-pad stack">
            <h2 style={{ fontSize: 16 }}>Escrow deposits</h2>
            <div className="grid-2">
              <label className="field"><span>Deposit (% of first month's rent)</span>
                <input className="input" type="number" min={0} max={300} value={s.depositPercent} onChange={e => set('depositPercent', +e.target.value)} />
              </label>
              <label className="field"><span>Auto-release after move-in (days)</span>
                <input className="input" type="number" min={0} value={s.escrowAutoReleaseDays} onChange={e => set('escrowAutoReleaseDays', +e.target.value)} />
                <small>Unless the tenant reports a problem first.</small>
              </label>
            </div>
          </section>
        </div>
      )}

      {tab === 'chat' && (
        <div className="stack">
          <section className="card card-pad stack">
            <label className="field"><span>Name tenants see when an admin replies</span>
              <input className="input" value={s.chatNameFormat} onChange={e => set('chatNameFormat', e.target.value)} />
              <small>{'{name}'} becomes the logged-in admin's name.</small>
            </label>
            <div className="row-wrap">
              {['{name} · DALALI', '{name} from DALALI', 'DALALI', '{name}'].map(f => (
                <button key={f} className={`chip${s.chatNameFormat === f ? ' on' : ''}`} onClick={() => set('chatNameFormat', f)}>{f}</button>
              ))}
            </div>
            <div className="card" style={{ padding: 14, background: 'var(--bg)' }}>
              <div className="small muted" style={{ marginBottom: 8 }}>Preview in the app</div>
              <div className="msg admin" style={{ maxWidth: '100%' }}>
                <div className="bubble">Karibu! Yes, it's still available. Would you like to book a viewing?</div>
                <span className="meta">{s.chatNameFormat.replace('{name}', me!.name)} · 10:24</span>
              </div>
            </div>
          </section>
          <section className="card card-pad">
            <SwitchRow title="In-app calls" desc="Show the call button in chats so tenants and admins can talk by voice without sharing phone numbers. Needs a voice service (e.g. Agora or Twilio) connected before it works live." checked={s.inAppCalls} onChange={v => set('inAppCalls', v)} />
          </section>
        </div>
      )}

      {tab === 'team' && <Team />}

      {reset && <Confirm danger title="Reset all demo data?" body="Your changes to listings, tenants, chats and payments will be replaced with the sample data." confirmLabel="Reset" onClose={() => setReset(false)} onConfirm={() => { resetDemo(); setS(structuredClone(db.settings)) }} />}
    </main>
  )
}

function Team() {
  const { db, me, saveAdmin, newAdminId } = useStore()
  const [edit, setEdit] = useState<Admin | null>(null)
  return (
    <>
      <section className="card">
        <div className="card-head">
          <div><h2>Admins</h2><span className="small muted">All admins have the same access. Tenants use the Android app.</span></div>
          <button className="btn btn-primary btn-sm" onClick={() => setEdit({ id: newAdminId(), name: '', email: '', phone: '', active: true })}><UserPlus size={15} /> Add admin</button>
        </div>
        <table className="table">
          <tbody>
            {db.admins.map(a => (
              <tr key={a.id}>
                <td><div className="row" style={{ gap: 12 }}><Avatar name={a.name} kind="admin" /><div><div className="cell-main">{a.name}{a.id === me!.id && <span className="muted small"> (you)</span>}</div><div className="cell-sub">{a.email}</div></div></div></td>
                <td className="hide-sm cell-sub">{a.phone}</td>
                <td>{a.active ? <span className="badge badge-teal">Active</span> : <span className="badge badge-red">Disabled</span>}</td>
                <td><div className="row-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEdit(structuredClone(a))}><Pencil size={14} /> Edit</button>
                  {a.id !== me!.id && <button className="btn btn-ghost btn-sm" onClick={() => saveAdmin({ ...a, active: !a.active })}>{a.active ? 'Disable' : 'Enable'}</button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {edit && <AdminModal a={edit} onClose={() => setEdit(null)} onSave={a => { saveAdmin(a); setEdit(null) }} />}
    </>
  )
}

function AdminModal({ a, onClose, onSave }: { a: Admin; onClose: () => void; onSave: (a: Admin) => void }) {
  const [f, setF] = useState(a)
  const ok = f.name.trim() && /\S+@\S+/.test(f.email)
  return (
    <Modal onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={!ok} onClick={() => onSave({ ...f, name: f.name.trim() })}>Save</button>
    </>}>
      <h2>{a.name ? `Edit ${a.name}` : 'Add admin'}</h2>
      <div className="stack" style={{ gap: 12, marginTop: 12 }}>
        <label className="field"><span>Display name</span><input className="input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Evans" /><small>Tenants see this name in chat.</small></label>
        <label className="field"><span>Email</span><input className="input" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
        <label className="field"><span>Phone</span><input className="input" type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></label>
      </div>
    </Modal>
  )
}
