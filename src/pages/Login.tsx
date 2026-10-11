import { useState } from 'react'
import { ArrowRight, Info } from 'lucide-react'
import { useStore } from '../data/store'
import { Avatar, Logo } from '../components/ui'

export default function Login() {
  const { db, signIn } = useStore()
  const [email, setEmail] = useState(db.admins[0]?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!signIn(email)) setError('No active admin with that email.')
  }

  return (
    <div className="login">
      <section className="login-art">
        <div className="logo-big">
          <Logo />
          <b>DALALI</b>
        </div>
        <div className="tag">Rent Smarter</div>
        <p>Admin dashboard. Manage listings, tenants, chats, viewings and payments for the DALALI app.</p>
        <div className="kanga" />
      </section>

      <section className="login-form">
        <form onSubmit={submit}>
          <div>
            <h1>Sign in</h1>
            <p className="muted" style={{ margin: '6px 0 0' }}>Admins only. Tenants use the Android app.</p>
          </div>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" autoComplete="username" value={email} onChange={e => { setEmail(e.target.value); setError('') }} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Any password works in demo mode" />
          </label>
          {error && <p className="small" style={{ color: 'var(--red)', margin: 0 }}>{error}</p>}
          <button className="btn btn-primary" type="submit" style={{ height: 46 }}>Sign in <ArrowRight size={18} /></button>

          <div className="notice">
            <Info size={18} />
            <div>
              <b>Demo mode.</b> Pick an admin to sign in as. Their name is what tenants see when you reply in chat.
            </div>
          </div>
          <div className="demo-admins">
            {db.admins.filter(a => a.active).map(a => (
              <button type="button" key={a.id} className={email === a.email ? 'on' : ''} onClick={() => setEmail(a.email)}>
                <Avatar name={a.name} size="sm" kind="admin" />
                <span className="grow"><b>{a.name}</b><br /><span className="small muted">{a.email}</span></span>
              </button>
            ))}
          </div>
        </form>
      </section>
    </div>
  )
}
